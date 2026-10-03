-- The geocode trigger (2026-09-30): no key in the schema, the URL and the
-- shared secret come from Vault, and filing a report never depends on it.
-- The seed switches the trigger off; this test switches it back on inside
-- its transaction. pg_net queues requests in net.http_request_queue and only
-- sends them after commit, so nothing leaves the machine.
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

select is(
  (select string_agg(t.tgname, ', ')
     from pg_trigger t
    where t.tgrelid = 'public.reports'::regclass
      and (pg_get_triggerdef(t.oid) ilike '%bearer%' or pg_get_triggerdef(t.oid) like '%eyJ%')),
  null,
  'no trigger on reports carries a token in its definition'
);

alter table public.reports enable trigger "trigger-geocode-on-insert";

create temporary table queued on commit drop as
  select coalesce(max(id), 0) as before from net.http_request_queue;

-- Without the Vault secrets (the local stack) nothing is requested.
insert into public.reports (category, component_id) values ('inlets', 'I-0');

select is(
  (select count(*)::int from net.http_request_queue where id > (select before from queued)),
  0,
  'without the Vault secrets the trigger requests nothing'
);

select vault.create_secret('https://example.invalid/functions/v1/geocodeWorker', 'geocode_worker_url');
select vault.create_secret('test-secret-0123456789', 'geocode_worker_secret');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('inlets', 'I-5', '00000000-0000-4000-a000-000000000003')$$,
  'a citizen files a report with the trigger on'
);

reset role;

select results_eq(
  $$select url, headers ->> 'x-geocode-secret', headers ? 'Authorization'
    from net.http_request_queue where id > (select before from queued)$$,
  $$values ('https://example.invalid/functions/v1/geocodeWorker'::text, 'test-secret-0123456789'::text, false)$$,
  'with them, one request goes to the worker with the shared secret and no JWT'
);

select ok(
  not has_function_privilege('authenticated', 'private.request_geocode()', 'execute'),
  'the trigger function cannot be called through the API'
);

select * from finish();
rollback;
