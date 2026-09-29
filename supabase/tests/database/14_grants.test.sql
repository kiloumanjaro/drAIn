-- Client privileges are only what the app uses (run plan 2.D1).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

-- No client role can write to any table except the two the app writes:
-- reports (INSERT, signed in only) and profiles (INSERT/UPDATE of one's own row).
select is(
  (select coalesce(string_agg(format('%s %s %s', grantee, privilege_type, table_name), ', '
                              order by table_name, grantee, privilege_type), '')
     from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type not in ('SELECT')),
  'authenticated INSERT profiles, authenticated UPDATE profiles, authenticated INSERT reports',
  'the only client writes are report inserts and own-profile edits'
);

select is(
  (select count(*)::int
     from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and table_name = 'geocode_worker_lock'),
  0,
  'the geocode worker lock is service-role only'
);

select is(
  (select count(*)::int
     from information_schema.role_usage_grants
    where object_schema = 'public'
      and object_type = 'SEQUENCE'
      and grantee in ('anon', 'authenticated')),
  0,
  'clients hold no sequence privileges'
);

-- Trigger functions can't be called through the API.
select is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
      and (has_function_privilege('anon', p.oid, 'execute')
           or has_function_privilege('authenticated', p.oid, 'execute'))),
  '',
  'no trigger function is executable by anon or authenticated'
);

select ok(
  not has_function_privilege('anon', 'private.extract_barangay_from_coordinates(double precision, double precision)', 'execute'),
  'the barangay lookup is private'
);

-- New objects grant nothing to clients by default.
create table public.grants_probe (id int);
create function public.grants_probe_fn() returns int language sql as 'select 1';

select ok(
  not has_table_privilege('anon', 'public.grants_probe', 'select')
    and not has_table_privilege('authenticated', 'public.grants_probe', 'select'),
  'a new table is not readable by clients until granted'
);

select ok(
  not has_function_privilege('anon', 'public.grants_probe_fn()', 'execute')
    and not has_function_privilege('authenticated', 'public.grants_probe_fn()', 'execute'),
  'a new function is not executable by clients until granted'
);

-- TRUNCATE ignores RLS; the privilege is what stops it.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$truncate public.reports$$, '42501', null, 'anon cannot truncate reports');
select throws_ok($$truncate public.components$$, '42501', null, 'anon cannot truncate reference tables');
select throws_ok($$update public.agencies set name = 'x'$$, '42501', null, 'anon cannot edit agencies');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok($$delete from public.profiles$$, '42501', null, 'a citizen cannot delete profiles');
select throws_ok($$truncate public.profiles$$, '42501', null, 'a citizen cannot truncate profiles');

select * from finish();
rollback;
