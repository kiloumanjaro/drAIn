-- Finished work is checked by someone other than whoever did it (trust
-- step 2). Impersonation pattern: see 01_baseline.test.sql.
--
-- Seed: maintenance ...c001 (I-0, resolved by Sam, staff ...0002) closed
-- Cora's report ...b001; ...c002 (O-0) is still in progress.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

select is(
  (select verification_status::text from public.maintenance
   where id = '00000000-0000-4000-c000-000000000001'),
  'unverified',
  'finished work starts unverified'
);

-- Sam can't vouch for his own work.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select throws_ok(
  $$select public.review_maintenance('00000000-0000-4000-c000-000000000001', 'confirmed')$$,
  '42501', null,
  'the person who did the work cannot check it'
);

-- Citizens can't use the staff check.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select throws_ok(
  $$select public.review_maintenance('00000000-0000-4000-c000-000000000001', 'confirmed')$$,
  '42501', null,
  'a citizen cannot use the staff check'
);

select throws_ok(
  $$select public.respond_to_resolution('00000000-0000-4000-b000-000000000001', 'confirmed')$$,
  '42501', null,
  'a citizen cannot answer for someone else''s report'
);

-- Ana (admin) checks Sam's work.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select throws_ok(
  $$select public.review_maintenance('00000000-0000-4000-c000-000000000002', 'confirmed')$$,
  'P0001', null,
  'work still in progress cannot be checked'
);

select throws_ok(
  $$select public.review_maintenance('00000000-0000-4000-c000-000000000001', 'disputed')$$,
  '22023', null,
  'a dispute needs a reason'
);

select is(
  (select verification_status::text
   from public.review_maintenance('00000000-0000-4000-c000-000000000001', 'confirmed')),
  'verified',
  'a colleague confirming the work verifies it'
);

select is(
  (select verified_fixed_this_month + awaiting_verification from public.dashboard_overview(now() - interval '30 days')),
  1,
  'the dashboard counts the verified fix and nothing left awaiting a check'
);

-- Cora, whose report the work closed, says it isn't fixed.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select results_eq(
  $$select status::text, resolved_at is null, resolved_by_maintenance_id is null
    from public.respond_to_resolution('00000000-0000-4000-b000-000000000001', 'disputed',
                                      'Still blocked after the rain.')$$,
  $$values ('pending', true, true)$$,
  'a reporter saying it is not fixed reopens their report'
);

select is(
  (select verification_status::text from public.maintenance
   where id = '00000000-0000-4000-c000-000000000001'),
  'disputed',
  'a dispute outweighs an earlier confirmation'
);

select results_eq(
  $$select reviewer_kind, verdict::text from public.maintenance_reviews$$,
  $$values ('reporter', 'disputed')$$,
  'a citizen sees only their own review'
);

select throws_ok(
  $$select public.respond_to_resolution('00000000-0000-4000-b000-000000000001', 'confirmed')$$,
  'P0001', null,
  'a reopened report cannot be confirmed as fixed'
);

-- Signed-out visitors can't read reviews at all.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select * from public.maintenance_reviews$$,
  '42501', null,
  'visitors cannot read reviews'
);

-- A staff dispute reopens every report the work closed. Sam resolves ISD-1
-- (Cora's report ...b003); Ana disputes it.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

create temp table work on commit drop as
select id from public.record_maintenance('storm_drains', 'ISD-1', 'resolved', 'Cleared.');

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000003'),
  'resolved',
  'recording the work resolves the report'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select public.review_maintenance((select id from work), 'disputed', 'Grate still full of silt.')$$,
  'a colleague can dispute the work'
);

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000003'),
  'pending',
  'a staff dispute puts the report back on the work list'
);

select results_eq(
  $$select verification_status::text, can_review, my_verdict::text, latest_dispute
    from public.maintenance_history('ISD-1')$$,
  $$values ('disputed', true, 'disputed', 'Grate still full of silt.')$$,
  'the history shows the check, who may review, and why it was disputed'
);

reset role;
select * from finish();
rollback;
