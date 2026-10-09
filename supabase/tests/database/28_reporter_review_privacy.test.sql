-- A reporter's answer to "was it fixed?" is a maintenance_reviews row holding
-- their account id (reviewer_id) beside the report they answered for. Staff
-- used to read every such row, which said which account filed which report
-- (reports.user_id is private for that reason). Migration
-- hide_reporter_reviews_from_staff: staff read only the checks staff made;
-- everyone still reads their own rows.
-- Impersonation pattern: see 01_baseline.test.sql.
--
-- Seed: maintenance ...c001 (I-0, resolved by Sam, staff ...0002) closed
-- Cora's (citizen ...0003) report ...b001. Ana (...0001) is the admin.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

-- Cora says it isn't fixed, then reads her answer back the way the app does
-- (fetchMyResolutionVerdicts in lib/supabase/report.ts).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$select public.respond_to_resolution('00000000-0000-4000-b000-000000000001', 'disputed',
                                        'Still blocked after the rain.')$$,
  'a reporter can still answer for their own report'
);

select results_eq(
  $$select report_id, verdict::text from public.maintenance_reviews
    where reviewer_id = '00000000-0000-4000-a000-000000000003' and report_id is not null$$,
  $$values ('00000000-0000-4000-b000-000000000001'::uuid, 'disputed')$$,
  'and read their own answer back, by reviewer_id'
);

-- Ana checks the same work, so the table holds one row of each kind.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select public.review_maintenance('00000000-0000-4000-c000-000000000001', 'confirmed')$$,
  'a colleague can still check the work'
);

select results_eq(
  $$select reviewer_kind, reviewer_id, verdict::text from public.maintenance_reviews$$,
  $$values ('staff', '00000000-0000-4000-a000-000000000001'::uuid, 'confirmed')$$,
  'an admin reads the staff check and not the reporter''s answer'
);

-- Sam, the staff member whose work it was.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select results_eq(
  $$select reviewer_kind, verdict::text from public.maintenance_reviews$$,
  $$values ('staff', 'confirmed')$$,
  'staff still read the checks colleagues made'
);
select is_empty(
  $$select reviewer_id from public.maintenance_reviews where reviewer_kind = 'reporter'$$,
  'staff cannot read a reporter''s account id from a review'
);
select is_empty(
  $$select id from public.maintenance_reviews
    where reviewer_id = '00000000-0000-4000-a000-000000000003'$$,
  'nor find a reporter''s reviews by guessing the id'
);
select is_empty(
  $$select id from public.maintenance_reviews
    where report_id = '00000000-0000-4000-b000-000000000001'$$,
  'nor look a review up by the report it answers'
);
select is(
  (select count(*)::int from public.maintenance_reviews),
  1,
  'so a count of rows does not include reporters'' answers either'
);

-- What staff need from the answer still reaches them, without the id.
select results_eq(
  $$select verification_status::text, latest_dispute from public.maintenance_history('I-0')
    where id = '00000000-0000-4000-c000-000000000001'$$,
  $$values ('disputed', 'Still blocked after the rain.')$$,
  'staff still see that the work was disputed, and why'
);
select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000001'),
  'pending',
  'and the report is back on the work list'
);

-- Another citizen.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is_empty(
  $$select id from public.maintenance_reviews$$,
  'another citizen reads no reviews'
);

reset role;

select is(
  (select count(*)::int from public.maintenance_reviews
   where maintenance_id = '00000000-0000-4000-c000-000000000001'),
  2,
  'both reviews are there; only what each person may read differs'
);
select policies_are('public', 'maintenance_reviews',
  ARRAY['Reviewers read their own reviews and staff read staff checks'],
  'the one policy on maintenance_reviews is the one that hides reporters'' answers from staff');

select * from finish();
rollback;
