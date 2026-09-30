-- The agency admin screen: listing members and changing their roles
-- (run plan 2.6). Impersonation pattern: see 01_baseline.test.sql.
-- Seeded: ...0001 admin and ...0002 staff of the City Engineer Office;
-- ...0003 and ...0004 citizens.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

create temporary table agency on commit drop as
  select agency_id as id from public.profiles
  where id = '00000000-0000-4000-a000-000000000001';
grant select on agency to anon, authenticated;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$select * from public.agency_members((select id from agency))$$,
  '42501', null,
  'visitors cannot list members'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';
select throws_ok(
  $$select * from public.agency_members((select id from agency))$$,
  '42501', null,
  'staff cannot list members either; it shows sign-in emails'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select results_eq(
  $$select email, role::text from public.agency_members((select id from agency))$$,
  $$values ('admin@drain.local', 'admin'), ('staff@drain.local', 'staff')$$,
  'the admin sees each member''s email and role, admins first'
);

select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000001', (select id from agency), 'staff')$$,
  '42501', null,
  'an admin cannot demote themselves'
);

select lives_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000002', (select id from agency), 'admin')$$,
  'an admin can promote a member'
);
select is(
  (select role::text from public.agency_members((select id from agency))
   where id = '00000000-0000-4000-a000-000000000002'),
  'admin',
  'and the list shows it'
);

select lives_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000002', (select id from agency), 'citizen')$$,
  'an admin can remove a member from the agency'
);
select is(
  (select count(*)::int from public.agency_members((select id from agency))),
  1,
  'who then leaves the list'
);

select matches(
  public.rotate_agency_join_code((select id from agency)),
  '^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$',
  'the admin can make a new join code'
);

select * from finish();
rollback;
