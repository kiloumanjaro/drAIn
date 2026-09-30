-- Signed-out visitors can't read who filed a report, where they stood, who
-- reviewed it, or who did the maintenance (run plan 2.3).
-- Impersonation pattern: see 01_baseline.test.sql.
-- Seeded report ...b000-000000000003 was filed by citizen ...0003.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$select user_id from public.reports$$, '42501', null, 'anon cannot read who filed a report');
select throws_ok($$select photo_lat, photo_lon from public.reports$$, '42501', null, 'anon cannot read where the reporter stood');
select throws_ok($$select reviewed_by from public.reports$$, '42501', null, 'anon cannot read who reviewed a report');
select throws_ok($$select * from public.reports$$, '42501', null, 'so select * fails for anon; the app names its columns');
select throws_ok($$select performed_by from public.maintenance$$, '42501', null, 'anon cannot read who did the maintenance');

select isnt_empty(
  $$select id, status, component_id, photo_check, review_status from public.reports$$,
  'anon still reads the public columns'
);
select isnt_empty(
  $$select * from public.latest_report_per_component$$,
  'anon can read the map''s latest-report view'
);
select isnt_empty(
  $$select component_id, report_count from public.report_counts_by_component$$,
  'anon can read report counts'
);
select isnt_empty(
  $$select day, report_count from public.report_counts_by_day$$,
  'anon can read reports per day (the map''s reports chart)'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select is(
  (select user_id from public.reports where id = '00000000-0000-4000-b000-000000000003'),
  '00000000-0000-4000-a000-000000000003'::uuid,
  'a citizen reads their own report in full'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok($$select reviewed_by, user_id from public.reports$$, 'staff still read reviewers and reporters');
select lives_ok($$select performed_by from public.maintenance$$, 'staff still read who did the maintenance');

select * from finish();
rollback;
