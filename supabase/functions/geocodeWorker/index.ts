// Downloaded from the hosted project as deployed (version 3) on 2026-09-29
// with `supabase functions download geocodeWorker`; unchanged. Called by the
// trigger-geocode-on-insert webhook (supabase/schemas/schema.sql). Nominatim's
// usage policy asks for a contact in the User-Agent; that is the one below.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const invocationId = crypto.randomUUID().substring(0, 8);
  let lockAcquired = false;
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log(`[${invocationId}] Attempting to acquire lock...`);
    // Try to acquire lock
    const { data: lock, error: lockError } = await supabase.from('geocode_worker_lock').update({
      is_running: true,
      started_at: new Date().toISOString(),
      started_by: invocationId
    }).eq('id', 1).eq('is_running', false).select().single();
    if (lockError || !lock) {
      console.log(`[${invocationId}] Lock already acquired by another instance, exiting gracefully`);
      return new Response(JSON.stringify({
        message: 'Worker already running',
        skipped: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    lockAcquired = true;
    console.log(`[${invocationId}] Lock acquired! Starting processing...`);
    const MAX_RUNTIME = 90000;
    const startTime = Date.now();
    let totalProcessed = 0;
    while(Date.now() - startTime < MAX_RUNTIME){
      const { data: reports, error } = await supabase.from('reports').select('id, lat, long').eq('geocoded_status', 'pending').order('created_at', {
        ascending: true
      }).limit(50);
      if (error) throw error;
      if (!reports || reports.length === 0) break;
      console.log(`[${invocationId}] Processing ${reports.length} reports`);
      for (const report of reports){
        try {
          await supabase.from('reports').update({
            geocoded_status: 'processing'
          }).eq('id', report.id);
          const address = await reverseGeocode(report.lat, report.long);
          await supabase.from('reports').update({
            address,
            geocoded_status: 'completed'
          }).eq('id', report.id);
          console.log(`[${invocationId}] ${report.id}: ${address}`);
          totalProcessed++;
          await new Promise((resolve)=>setTimeout(resolve, 1000));
          if (Date.now() - startTime > MAX_RUNTIME) break;
        } catch (err) {
          console.error(`[${invocationId}] Failed ${report.id}:`, err);
          await supabase.from('reports').update({
            geocoded_status: 'failed'
          }).eq('id', report.id);
        }
      }
    }
    // Check if more pending reports exist
    const { count } = await supabase.from('reports').select('id', {
      count: 'exact',
      head: true
    }).eq('geocoded_status', 'pending');
    console.log(`[${invocationId}] Finished processing ${totalProcessed} reports`);
    // Release lock once
    if (lockAcquired) {
      await supabase.from('geocode_worker_lock').update({
        is_running: false
      }).eq('id', 1);
      lockAcquired = false;
      console.log(`[${invocationId}] Lock released`);
    }
    // Re-trigger if more work to do
    if (count && count > 0) {
      console.log(`[${invocationId}] ${count} reports remaining, re-triggering...`);
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/geocodeWorker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      }).catch(()=>{});
    }
    return new Response(JSON.stringify({
      processed: totalProcessed,
      remaining: count || 0,
      invocationId
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`[${invocationId}] Worker error:`, error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  } finally{
    // Only release if we still have the lock
    if (lockAcquired) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        await supabase.from('geocode_worker_lock').update({
          is_running: false
        }).eq('id', 1);
        console.log(`[${invocationId}] Lock released (finally block)`);
      } catch (err) {
        console.error(`[${invocationId}] Failed to release lock in finally:`, err);
      }
    }
  }
});
async function reverseGeocode(lat, long) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DrainApp/1.0 (AI-driven drainage monitoring; najazul@up.edu.ph)'
    }
  });
  if (!response.ok) {
    throw new Error('Geocoding failed');
  }
  const data = await response.json();
  const addr = data.address || {};
  const addr_suffix = "Cebu, Philippines";
  const parts = [
    addr.road,
    addr.suburb || addr.neighbourhood,
    addr.city || 'Mandaue City',
    addr_suffix
  ].filter(Boolean);
  return parts.join(', ') || 'Address not found';
}
