-- Simulation runs recorded by the simulation server (trust step 5).
-- Impersonation pattern: see 01_baseline.test.sql. The server writes as
-- service_role.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select lives_ok(
  $$insert into public.simulation_runs (id, user_id, request)
    values ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000003',
            '{"rainfall": {"total_precip": 100, "duration_hr": 2}}')$$,
  'the simulation server records a queued run'
);

select throws_ok(
  $$update public.simulation_runs set status = 'succeeded'
    where id = '00000000-0000-4000-f000-000000000001'$$,
  '23514', null,
  'a run cannot succeed without a result'
);

select lives_ok(
  $$update public.simulation_runs
    set status = 'succeeded', result = '{"nodes_list": []}', finished_at = now()
    where id = '00000000-0000-4000-f000-000000000001'$$,
  'and records how it finished'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select results_eq(
  $$select status::text from public.simulation_runs$$,
  $$values ('succeeded')$$,
  'a user reads their own runs'
);

select throws_ok(
  $$insert into public.simulation_runs (id, user_id)
    values (gen_random_uuid(), '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'users cannot write runs themselves'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is_empty(
  $$select * from public.simulation_runs$$,
  'nobody else sees them'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select * from public.simulation_runs$$,
  '42501', null,
  'visitors cannot read runs'
);

reset role;
select * from finish();
rollback;
