-- Access checks that held before the hardening work and must keep holding.
-- Run with `npx supabase test db` against the seeded local database.
--
-- Impersonation pattern used by every file in this folder:
--   anon:          set local role anon;
--                  set local request.jwt.claims = '{"role":"anon"}';
--   a seeded user: set local role authenticated;
--                  set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
--   back to owner: reset role;
-- Seeded users (see supabase/seed.sql): ...0001 admin, ...0002 staff,
-- ...0003 citizen, ...0004 citizen2.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

select is(
  (select count(*)::int from auth.users where email like '%@drain.local'),
  4,
  'seed creates four users'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select isnt_empty(
  'select id from public.reports',
  'anon can read reports (the public map depends on it)'
);

select isnt_empty(
  'select name from public.agencies',
  'anon can read agencies'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select results_eq(
  'select id from public.profiles',
  $$values ('00000000-0000-4000-a000-000000000003'::uuid)$$,
  'a citizen reads only their own profile'
);

reset role;
select * from finish();
rollback;
