-- The agency admin screen: listing members and changing their roles
-- (run plan 2.6). Impersonation pattern: see 01_baseline.test.sql.
-- Seeded: ...0001 admin and ...0002 staff of the City Engineer Office;
-- ...0003 and ...0004 citizens. The test adds a second agency with its own
-- admin (...00f1) to check that an admin's powers stop at their own agency.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

create temporary table agency on commit drop as
  select agency_id as id from public.profiles
  where id = '00000000-0000-4000-a000-000000000001';
grant select on agency to anon, authenticated;

insert into public.agencies (id, name) values ('00000000-0000-4000-d000-0000000000f0', 'Other Agency');
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000f1',
        'authenticated', 'authenticated', 'other-admin@drain.local', '{"full_name":"Olga Other"}');
update public.profiles set role = 'admin', agency_id = '00000000-0000-4000-d000-0000000000f0'
where id = '00000000-0000-4000-a000-0000000000f1';

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

-- An admin's powers stop at their own agency.
select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-0000000000f1', (select id from agency), 'staff')$$,
  '42501', 'That person belongs to another agency.',
  'an admin cannot pull another agency''s member into theirs'
);
select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-d000-0000000000f0', 'admin')$$,
  '42501', null,
  'or make anyone a member, let alone admin, of another agency'
);
select throws_ok(
  $$update public.profiles set agency_id = '00000000-0000-4000-d000-0000000000f0'
    where id = '00000000-0000-4000-a000-000000000001'$$,
  '42501', 'Only an admin can change a role or agency.',
  'an admin cannot move themselves to another agency with a plain update'
);
select throws_ok(
  $$update public.profiles set role = 'staff' where id = '00000000-0000-4000-a000-000000000001'$$,
  '42501', 'Only an admin can change a role or agency.',
  'or change their own role that way'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-0000000000f1","role":"authenticated"}';

select throws_ok(
  $$select * from public.agency_members((select id from agency))$$,
  '42501', null,
  'another agency''s admin cannot list this agency''s members'
);
select throws_ok(
  $$select public.rotate_agency_join_code((select id from agency))$$,
  '42501', null,
  'or rotate its join code'
);
select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-d000-0000000000f0', 'staff')$$,
  '42501', 'That person belongs to another agency.',
  'or take its admin into their own agency'
);
select results_eq(
  $$select email from public.agency_members('00000000-0000-4000-d000-0000000000f0')$$,
  $$values ('other-admin@drain.local')$$,
  'but still manages their own'
);

reset role;
select is(
  (select role::text from public.profiles where id = '00000000-0000-4000-a000-000000000001'),
  'admin',
  'the first agency''s admin is untouched'
);

select * from finish();
rollback;
