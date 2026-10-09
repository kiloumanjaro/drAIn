-- An admin manages people already in their agency but cannot bring a citizen
-- in: people join with the join code (migration join_code_only). Adding
-- someone and then listing members was a way to learn any reporter's name and
-- sign-in email. Also: a request is treated as coming from a client when
-- either the database role or the token says so.
-- Impersonation pattern: see 01_baseline.test.sql. Seeded: ...0001 admin and
-- ...0002 staff of the City Engineer Office; ...0003 and ...0004 citizens.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

create temporary table agency on commit drop as
  select agency_id as id from public.profiles
  where id = '00000000-0000-4000-a000-000000000001';
grant select on agency to anon, authenticated, service_role;

insert into public.agencies (id, name) values ('00000000-0000-4000-d000-0000000000f0', 'Other Agency');

select ok(not private.is_api_caller(), 'a direct database session is not an API caller');

-- The admin, through the API ----------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select ok(private.is_api_caller(), 'a signed-in request is');

select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000004', (select id from agency), 'staff')$$,
  '42501', 'People join an agency with its join code.',
  'an admin cannot make a citizen staff of their agency'
);
select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000004', (select id from agency), 'admin')$$,
  '42501', 'People join an agency with its join code.',
  'or admin'
);
select throws_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000004', (select id from agency), 'citizen')$$,
  '42501', 'People join an agency with its join code.',
  'or touch a citizen''s profile at all'
);
select is(
  (select count(*)::int from public.agency_members((select id from agency))),
  2,
  'so the member list, with its emails, gains nobody'
);
select lives_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000002', (select id from agency), 'admin')$$,
  'an admin still changes the role of someone already in the agency'
);
select lives_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000002', (select id from agency), 'citizen')$$,
  'and still removes them'
);

-- A token with no role claim is still a client ------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001"}';

select throws_ok(
  $$select public.rotate_agency_join_code('00000000-0000-4000-d000-0000000000f0')$$,
  '42501', null,
  'a signed-in request whose token lacks a role is not mistaken for a direct session'
);

-- Anon ----------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select ok(private.is_api_caller(), 'a signed-out request is an API caller');

-- The service role and direct sessions keep the ability ---------------------------

reset role;
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select is(
  (select role::text from public.set_member_agency('00000000-0000-4000-a000-000000000004', (select id from agency), 'staff')),
  'staff',
  'the service role can place a citizen in an agency'
);

reset role;
set local request.jwt.claims = '';

select is(
  (select role::text from public.set_member_agency('00000000-0000-4000-a000-000000000003', (select id from agency), 'staff')),
  'staff',
  'and so can a direct database session'
);

select * from finish();
rollback;
