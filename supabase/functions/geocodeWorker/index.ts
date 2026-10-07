// Downloaded from the hosted project as deployed (version 3) on 2026-09-29
// with `supabase functions download geocodeWorker`. Changed 2026-09-30:
//   * callers must send x-geocode-secret equal to the GEOCODE_WORKER_SECRET
//     env var (compared in constant time); with the env var unset every call
//     is refused. The database trigger (private.request_geocode in
//     supabase/schemas/schema.sql) reads the same secret from Vault. Deploy
//     with --no-verify-jwt: the trigger no longer sends the service-role JWT.
//   * a lock held for more than 3 minutes (a run that crashed before
//     releasing it) is taken over instead of blocking geocoding for good.
//   * no CORS: only the database and this function itself call it.
// Changed 2026-10-04:
//   * every database write is checked. A report whose update fails (an old
//     row that breaks a newer constraint, say) used to stay 'pending' and be
//     geocoded again every second for the rest of the run, and the run then
//     re-triggered itself for good.
//   * the worker only re-triggers itself after a run that got something done.
//   * reports left 'processing' by a run that died are queued again, and
//     reports with no coordinates are marked failed rather than left pending.
// Nominatim's usage policy asks for a contact in the User-Agent: set the
// GEOCODE_CONTACT env var (an email address or URL) on the function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const jsonHeaders = {
  'Content-Type': 'application/json'
};
// A run lasts at most MAX_RUNTIME (90 s) plus one request; a lock older than
// this was left by a run that died.
const STALE_LOCK_MS = 3 * 60 * 1000;
function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Compare every byte of the longer input so the time doesn't reveal where
  // the first difference is, or (beyond the length check) how long it is.
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for(let i = 0; i < n; i++){
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}
function isAuthorised(req) {
  const expected = Deno.env.get('GEOCODE_WORKER_SECRET') ?? '';
  // Fail closed: without a configured secret nobody may run the worker.
  if (expected.length < 16) return false;
  const given = req.headers.get('x-geocode-secret') ?? '';
  return timingSafeEqual(given, expected);
}
Deno.serve(async (req)=>{
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      headers: jsonHeaders,
      status: 405
    });
  }
  if (!isAuthorised(req)) {
    return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      headers: jsonHeaders,
      status: 401
    });
  }
  const invocationId = crypto.randomUUID().substring(0, 8);
  let lockAcquired = false;
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log(`[${invocationId}] Attempting to acquire lock...`);
    // Try to acquire lock: free, or held by a run that died (stale).
    const staleBefore = new Date(Date.now() - STALE_LOCK_MS).toISOString();
    const { data: lock, error: lockError } = await supabase.from('geocode_worker_lock').update({
      is_running: true,
      started_at: new Date().toISOString(),
      started_by: invocationId
    }).eq('id', 1).or(`is_running.eq.false,is_running.is.null,started_at.is.null,started_at.lt.${staleBefore}`).select().single();
    if (lockError || !lock) {
      console.log(`[${invocationId}] Lock already acquired by another instance, exiting gracefully`);
      return new Response(JSON.stringify({
        message: 'Worker already running',
        skipped: true
      }), {
        headers: jsonHeaders
      });
    }
    lockAcquired = true;
    console.log(`[${invocationId}] Lock acquired! Starting processing...`);
    // Holding the lock means no other run is alive, so anything still
    // 'processing' was abandoned by a run that died: queue it again.
    const requeued = await supabase.from('reports').update({
      geocoded_status: 'pending'
    }).eq('geocoded_status', 'processing');
    if (requeued.error) console.error(`[${invocationId}] Could not requeue abandoned reports:`, requeued.error);
    // A report with no position can never be geocoded.
    const unplaced = await supabase.from('reports').update({
      geocoded_status: 'failed'
    }).eq('geocoded_status', 'pending').or('lat.is.null,long.is.null');
    if (unplaced.error) console.error(`[${invocationId}] Could not fail reports without coordinates:`, unplaced.error);
    const MAX_RUNTIME = 90000;
    const startTime = Date.now();
    let totalProcessed = 0;
    // Reports this run could not even mark as failed. They stay 'pending',
    // so they are left out of the next batch instead of being retried.
    const stuck = new Set();
    while(Date.now() - startTime < MAX_RUNTIME){
      let query = supabase.from('reports').select('id, lat, long').eq('geocoded_status', 'pending');
      if (stuck.size > 0) query = query.not('id', 'in', `(${[
        ...stuck
      ].join(',')})`);
      const { data: reports, error } = await query.order('created_at', {
        ascending: true
      }).limit(50);
      if (error) throw error;
      if (!reports || reports.length === 0) break;
      console.log(`[${invocationId}] Processing ${reports.length} reports`);
      for (const report of reports){
        try {
          const claimed = await supabase.from('reports').update({
            geocoded_status: 'processing'
          }).eq('id', report.id);
          if (claimed.error) throw claimed.error;
          const address = await reverseGeocode(report.lat, report.long);
          const saved = await supabase.from('reports').update({
            address,
            geocoded_status: 'completed'
          }).eq('id', report.id);
          if (saved.error) throw saved.error;
          console.log(`[${invocationId}] ${report.id}: ${address}`);
          totalProcessed++;
          await new Promise((resolve)=>setTimeout(resolve, 1000));
          if (Date.now() - startTime > MAX_RUNTIME) break;
        } catch (err) {
          console.error(`[${invocationId}] Failed ${report.id}:`, err);
          const failed = await supabase.from('reports').update({
            geocoded_status: 'failed'
          }).eq('id', report.id);
          if (failed.error) {
            console.error(`[${invocationId}] Could not mark ${report.id} failed:`, failed.error);
            stuck.add(report.id);
          }
        }
      }
    }
    // Check if more pending reports exist
    const { count } = await supabase.from('reports').select('id', {
      count: 'exact',
      head: true
    }).eq('geocoded_status', 'pending');
    console.log(`[${invocationId}] Finished processing ${totalProcessed} reports`);
    // Release lock once (only if it is still ours, not taken over as stale)
    if (lockAcquired) {
      await supabase.from('geocode_worker_lock').update({
        is_running: false
      }).eq('id', 1).eq('started_by', invocationId);
      lockAcquired = false;
      console.log(`[${invocationId}] Lock released`);
    }
    // Re-trigger if more work to do, but only after a run that got somewhere:
    // if nothing could be processed, another run would do no better.
    if (totalProcessed > 0 && count && count > 0) {
      console.log(`[${invocationId}] ${count} reports remaining, re-triggering...`);
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/geocodeWorker`, {
        method: 'POST',
        headers: {
          'x-geocode-secret': Deno.env.get('GEOCODE_WORKER_SECRET') ?? ''
        }
      }).catch(()=>{});
    }
    return new Response(JSON.stringify({
      processed: totalProcessed,
      remaining: count || 0,
      invocationId
    }), {
      headers: jsonHeaders
    });
  } catch (error) {
    console.error(`[${invocationId}] Worker error:`, error);
    return new Response(JSON.stringify({
      error: 'Worker failed'
    }), {
      headers: jsonHeaders,
      status: 500
    });
  } finally{
    // Only release if we still have the lock
    if (lockAcquired) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        await supabase.from('geocode_worker_lock').update({
          is_running: false
        }).eq('id', 1).eq('started_by', invocationId);
        console.log(`[${invocationId}] Lock released (finally block)`);
      } catch (err) {
        console.error(`[${invocationId}] Failed to release lock in finally:`, err);
      }
    }
  }
});
async function reverseGeocode(lat, long) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`;
  const contact = Deno.env.get('GEOCODE_CONTACT') || 'https://github.com/kiloumanjaro/drAIn';
  const response = await fetch(url, {
    headers: {
      'User-Agent': `DrainApp/1.0 (AI-driven drainage monitoring; ${contact})`
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
