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
// Changed 2026-10-09 (the decisions are in decide.ts, tested by decide.test.ts):
//   * requests to Nominatim are at least a second apart whatever the last one
//     did. The pause used to follow only a success, so during an outage a
//     batch fired up to 50 requests with no pause at all.
//   * "the service could not be asked" (no connection, a timeout, 5xx, 429,
//     403) is told apart from "it has nothing for this position". Only the
//     second marks a report 'failed'; the first leaves it 'pending'. An
//     outage used to mark every report it touched 'failed', and nothing
//     retries those.
//   * after three unavailable answers in a row the run stops and does not
//     re-trigger itself. The reports are picked up by the next run, which the
//     next new report starts (private.request_geocode).
//   * a request is given up on after 10 seconds.
// Nominatim's usage policy asks for a contact in the User-Agent: set the
// GEOCODE_CONTACT env var (an email address or URL) on the function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { classifyGeocodeResponse, msUntilNextRequest, shouldStopRun } from './decide.ts';
const jsonHeaders = {
  'Content-Type': 'application/json'
};
// A run lasts at most MAX_RUNTIME (90 s) plus one request; a lock older than
// this was left by a run that died.
const STALE_LOCK_MS = 3 * 60 * 1000;
// Longest wait for one answer from Nominatim.
const GEOCODE_TIMEOUT_MS = 10000;
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
    // Reports the service could not be asked about. They stay 'pending' for
    // a later run and are not asked about again in this one.
    const deferred = new Set();
    let consecutiveUnavailable = 0;
    // Set once the service looks down: the run ends and does not re-trigger.
    let serviceDown = false;
    // When the last request to Nominatim finished, whatever came of it.
    let lastRequestAt = null;
    while(!serviceDown && Date.now() - startTime < MAX_RUNTIME){
      let query = supabase.from('reports').select('id, lat, long').eq('geocoded_status', 'pending');
      const skipped = [
        ...stuck,
        ...deferred
      ];
      if (skipped.length > 0) query = query.not('id', 'in', `(${skipped.join(',')})`);
      const { data: reports, error } = await query.order('created_at', {
        ascending: true
      }).limit(50);
      if (error) throw error;
      if (!reports || reports.length === 0) break;
      console.log(`[${invocationId}] Processing ${reports.length} reports`);
      for (const report of reports){
        if (Date.now() - startTime > MAX_RUNTIME) break;
        try {
          const claimed = await supabase.from('reports').update({
            geocoded_status: 'processing'
          }).eq('id', report.id);
          if (claimed.error) throw claimed.error;
          // At most one request a second, after failures as much as after
          // successes.
          const wait = msUntilNextRequest(lastRequestAt, Date.now());
          if (wait > 0) await new Promise((resolve)=>setTimeout(resolve, wait));
          const outcome = await reverseGeocode(report.lat, report.long);
          lastRequestAt = Date.now();
          if (outcome.kind === 'unavailable') {
            // Says nothing about this report: put it back in the queue.
            const released = await supabase.from('reports').update({
              geocoded_status: 'pending'
            }).eq('id', report.id);
            // Left 'processing', it is queued again by the next run.
            if (released.error) console.error(`[${invocationId}] Could not requeue ${report.id}:`, released.error);
            deferred.add(report.id);
            consecutiveUnavailable++;
            console.warn(`[${invocationId}] Geocoder unavailable for ${report.id} (${consecutiveUnavailable} in a row)`);
            if (shouldStopRun(consecutiveUnavailable)) {
              console.warn(`[${invocationId}] Geocoder looks down, stopping this run`);
              serviceDown = true;
              break;
            }
            continue;
          }
          consecutiveUnavailable = 0;
          if (outcome.kind === 'no_result') {
            // The service answered and has nothing for this position: a
            // real failure, marked below.
            throw new Error('No address for this position');
          }
          const address = outcome.address;
          const saved = await supabase.from('reports').update({
            address,
            geocoded_status: 'completed'
          }).eq('id', report.id);
          if (saved.error) throw saved.error;
          console.log(`[${invocationId}] ${report.id}: ${address}`);
          totalProcessed++;
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
    // if nothing could be processed, another run would do no better. Nor
    // after a run the geocoder cut short: it needs leaving alone.
    if (totalProcessed > 0 && !serviceDown && count && count > 0) {
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
      geocoderUnavailable: serviceDown,
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
// Asks Nominatim for the address at a position and says what the answer
// means (classifyGeocodeResponse in decide.ts). Never throws: no response,
// a timeout and an unreadable body are all "unavailable".
async function reverseGeocode(lat, long) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`;
  const contact = Deno.env.get('GEOCODE_CONTACT') || 'https://github.com/kiloumanjaro/drAIn';
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': `DrainApp/1.0 (AI-driven drainage monitoring; ${contact})`
      },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS)
    });
  } catch  {
    return classifyGeocodeResponse(null);
  }
  if (!response.ok) {
    // Discard the body so the connection is released.
    await response.body?.cancel().catch(()=>{});
    return classifyGeocodeResponse(response.status);
  }
  let data;
  try {
    data = await response.json();
  } catch  {
    data = undefined;
  }
  return classifyGeocodeResponse(response.status, data);
}
