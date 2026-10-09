-- Roles, agency membership and join codes (checklist step 2).
-- Impersonation pattern: see 01_baseline.test.sql.
-- Seeded: ...0001 admin and ...0002 staff of the City Engineer Office
-- (6b307b70-...), ...0003 and ...0004 citizens. Join code DRAIN-LOCAL-01.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

-- Sign-up can't claim a role -------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000ff',
        'authenticated', 'authenticated', 'sneaky@drain.local',
        '{"full_name":"Sneaky","role":"admin"}');

select is(
  (select role::text from public.profiles where id = '00000000-0000-4000-a000-0000000000ff'),
  'citizen',
  'sign-up metadata role is ignored; new accounts are citizens'
);

-- A citizen can't grant themselves anything ---------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000003'$$,
  '42501', 'Only an admin can change a role or agency.',
  'a citizen cannot change their own role'
);

select throws_ok(
  $$update public.profiles set agency_id = '6b307b70-0fa4-46df-a66c-0df8a16cca3d'
    where id = '00000000-0000-4000-a000-000000000003'$$,
  '42501', 'Only an admin can change a role or agency.',
  'a citizen cannot set their own agency'
);

select lives_ok(
  $$update public.profiles set full_name = 'Cora C.' where id = '00000000-0000-4000-a000-000000000003'$$,
  'a citizen can still edit their own name'
);

select throws_ok(
  'select * from private.agency_join_codes',
  '42501', 'permission denied for table agency_join_codes',
  'join code hashes cannot be read by users'
);

select throws_ok(
  $$select public.rotate_agency_join_code('6b307b70-0fa4-46df-a66c-0df8a16cca3d')$$,
  '42501', 'Only an admin can rotate a join code.',
  'a citizen cannot rotate a join code'
);

select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000003',
                                    '6b307b70-0fa4-46df-a66c-0df8a16cca3d', 'admin')$$,
  '42501', null,
  'a citizen cannot promote anyone'
);

-- Joining and leaving with a code --------------------------------------------

-- A wrong code returns null rather than raising, so the try it cost stays
-- counted (see join_agency and 12_rate_limits).
select is(
  (public.join_agency('WRONG-CODE-00')).id,
  null::uuid,
  'a wrong code is refused'
);

select is(
  (select role::text from public.profiles where id = '00000000-0000-4000-a000-000000000003'),
  'citizen',
  'a refused code changes nothing'
);

select is(
  (select (public.join_agency('drain local 01')).name),
  'City Engineer Office',
  'the right code joins the agency, ignoring case, spaces and dashes'
);

select results_eq(
  $$select role::text, agency_id from public.profiles where id = '00000000-0000-4000-a000-000000000003'$$,
  $$values ('staff', '6b307b70-0fa4-46df-a66c-0df8a16cca3d'::uuid)$$,
  'joining makes the citizen staff of that agency'
);

select lives_ok('select public.leave_agency()', 'staff can leave their agency');

select results_eq(
  $$select role::text, agency_id from public.profiles where id = '00000000-0000-4000-a000-000000000003'$$,
  $$values ('citizen', null::uuid)$$,
  'leaving makes them a citizen again'
);

-- Staff can't promote themselves --------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000002'$$,
  '42501', 'Only an admin can change a role or agency.',
  'staff cannot make themselves admin'
);

-- Admins rotate codes; they do not add members -------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select matches(
  set_config('test.new_code',
             public.rotate_agency_join_code('6b307b70-0fa4-46df-a66c-0df8a16cca3d'), true),
  '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$',
  'an admin can rotate a code and gets the new one back'
);

select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000004',
                                    '6b307b70-0fa4-46df-a66c-0df8a16cca3d', 'staff')$$,
  '42501', 'People join an agency with its join code.',
  'an admin cannot pull a citizen into the agency; they join with the code'
);

-- After rotation only the new code works --------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select is(
  (public.join_agency('DRAIN-LOCAL-01')).id,
  null::uuid,
  'the old code stops working after rotation'
);

select is(
  (select (public.join_agency(current_setting('test.new_code'))).name),
  'City Engineer Office',
  'the new code works'
);

reset role;
select * from finish();
rollback;
