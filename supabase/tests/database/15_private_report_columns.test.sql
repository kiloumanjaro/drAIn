-- Signed-out visitors can't read who filed a report, where they stood, who
-- reviewed it, or who did the maintenance (run plan 2.3). Since 2026-09-30
-- signed-in users can't read the report columns either: a reporter reads
-- their own through my_reports, the reporter or staff one report's through
-- report_private_details (which says whether a report is the caller's, not
-- whose it is).
-- Impersonation pattern: see 01_baseline.test.sql.
-- Seeded report ...b000-000000000003 was filed by citizen ...0003 and
-- reviewed by staff ...0002; ...b000-000000000002 was filed by ...0004.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

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

select throws_ok($$select * from public.my_reports()$$, '42501', null, 'anon has no reports of their own to list');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok($$select user_id from public.reports$$, '42501', null, 'a signed-in user cannot read who filed reports');
select throws_ok($$select photo_lat, photo_lon from public.reports$$, '42501', null, 'or where reporters stood');
select throws_ok($$select reviewed_by from public.reports$$, '42501', null, 'or who reviewed them');
select isnt_empty(
  $$select id, status, component_id, photo_check, review_status from public.reports$$,
  'signed-in users read the public columns'
);

select is(
  (select user_id from public.my_reports() where id = '00000000-0000-4000-b000-000000000003'),
  '00000000-0000-4000-a000-000000000003'::uuid,
  'a citizen reads their own report in full'
);
select results_eq(
  $$select count(*)::int, count(*) filter (where user_id <> '00000000-0000-4000-a000-000000000003')::int
    from public.my_reports()$$,
  $$values (2, 0)$$,
  'and only their own'
);
select results_eq(
  $$select is_mine, photo_lat, photo_lon
    from public.report_private_details(array['00000000-0000-4000-b000-000000000003'::uuid])$$,
  $$values (true, 10.31456::double precision, 123.92322::double precision)$$,
  'a reporter reads where they stood for their own report'
);
select is_empty(
  $$select * from public.report_private_details(array['00000000-0000-4000-b000-000000000002'::uuid])$$,
  'but not for someone else''s'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select throws_ok($$select reviewed_by, user_id from public.reports$$, '42501', null, 'staff cannot select the private columns directly either');
select results_eq(
  $$select is_mine, reviewed_by
    from public.report_private_details(array['00000000-0000-4000-b000-000000000003'::uuid])$$,
  $$values (false, '00000000-0000-4000-a000-000000000002'::uuid)$$,
  'staff read a report''s reviewer through report_private_details, not who filed it'
);
select throws_ok($$select performed_by from public.maintenance$$, '42501', null,
  'staff cannot read who did the maintenance from the table; maintenance_history names them');

reset role;
select ok(
  not has_table_privilege('authenticated', 'public.reports', 'SELECT')
    and not has_column_privilege('authenticated', 'public.reports', 'user_id', 'SELECT')
    and not has_column_privilege('authenticated', 'public.reports', 'photo_lat', 'SELECT')
    and not has_column_privilege('authenticated', 'public.reports', 'photo_lon', 'SELECT')
    and not has_column_privilege('authenticated', 'public.reports', 'reviewed_by', 'SELECT'),
  'the private columns are granted to no client role (realtime leaves them out too)'
);
select is(
  (select string_agg(column_name, ', ' order by column_name)
     from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'reports'
      and has_column_privilege('anon', 'public.reports', c.column_name, 'SELECT')
          <> has_column_privilege('authenticated', 'public.reports', c.column_name, 'SELECT')),
  null,
  'signed in or not, clients read the same report columns'
);

select * from finish();
rollback;
