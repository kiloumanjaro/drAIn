-- Staff read the checks their colleagues made, but not who made them: until
-- migration hide_reviewer_ids any agency member read every staff check's
-- reviewer_id (an account id). reviewer_id is now left out of the column
-- grant, and a person reads their own answers through my_resolution_verdicts.
-- Impersonation pattern: see 01_baseline.test.sql.
--
-- Seed: maintenance ...c001 (I-0, resolved by Sam, staff ...0002) closed
-- Cora's (citizen ...0003) report ...b001. Ana (...0001) is the admin.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

select ok(
  not has_column_privilege('authenticated', 'public.maintenance_reviews', 'reviewer_id', 'select'),
  'signed-in users have no SELECT on maintenance_reviews.reviewer_id'
);
select ok(
  has_column_privilege('authenticated', 'public.maintenance_reviews', 'verdict', 'select'),
  'but still read the verdict'
);

-- Cora says it isn't fixed; then Ana checks Sam's work.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';
select lives_ok(
  $$select public.respond_to_resolution('00000000-0000-4000-b000-000000000001', 'disputed',
                                        'Still blocked.')$$,
  'the reporter answers for their report'
);
select results_eq(
  $$select report_id, verdict::text from public.my_resolution_verdicts()$$,
  $$values ('00000000-0000-4000-b000-000000000001'::uuid, 'disputed')$$,
  'the reporter reads their own answer through my_resolution_verdicts'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';
select lives_ok(
  $$select public.review_maintenance('00000000-0000-4000-c000-000000000001', 'confirmed')$$,
  'a colleague checks the work'
);

-- Sam, staff: he reads Ana's check but not her account id.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';
select throws_ok(
  $$select reviewer_id from public.maintenance_reviews$$,
  '42501', null,
  'staff cannot read reviewer_id'
);
select throws_ok(
  $$select * from public.maintenance_reviews$$,
  '42501', null,
  'so select * fails too'
);
select throws_ok(
  $$select id from public.maintenance_reviews
    where reviewer_id = '00000000-0000-4000-a000-000000000001'$$,
  '42501', null,
  'nor can staff filter on it'
);
select results_eq(
  $$select reviewer_kind, verdict::text from public.maintenance_reviews$$,
  $$values ('staff', 'confirmed')$$,
  'staff still read the check itself'
);
select is_empty(
  $$select * from public.my_resolution_verdicts()$$,
  'my_resolution_verdicts returns nothing of anyone else''s'
);
select is(
  (select verification_status::text from public.maintenance_history('I-0')
   where id = '00000000-0000-4000-c000-000000000001'),
  'disputed',
  'maintenance_history still reads every review'
);

-- Ana's own check still shows as hers in the history.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';
select is(
  (select my_verdict::text from public.maintenance_history('I-0')
   where id = '00000000-0000-4000-c000-000000000001'),
  'confirmed',
  'and still finds the caller''s own check'
);
select is_empty(
  $$select * from public.my_resolution_verdicts()$$,
  'a staff check answers for no report, so it is not a resolution verdict'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$select * from public.my_resolution_verdicts()$$,
  '42501', null,
  'a signed-out visitor cannot call my_resolution_verdicts'
);

select * from finish();
rollback;
