-- Dashboard read models (checklist step 6). Impersonation: see 01_baseline.
-- Seed facts used below:
--   report 1 (I-0)   resolved; filed 20 days ago, resolved 15 days ago by
--                    City Engineer Office maintenance -> 5.0 repair days
--   report 2 (O-0)   in-progress, linked to that agency's maintenance
--   reports 3 and 4  pending, no maintenance
--   staff: admin@ and staff@ -> 2

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select results_eq(
  $$select fixed_this_month, pending_issues, average_repair_days, total_staff
    from public.dashboard_overview(now() - interval '30 days')$$,
  $$values (1, 2, 5.0::numeric, 2)$$,
  'overview counts resolved, pending, average repair days and staff, even for a visitor'
);

select is(
  (select fixed_this_month from public.dashboard_overview(now() - interval '10 days')),
  0,
  '"fixed this month" goes by when the report was resolved'
);

select results_eq(
  $$select agency_name, total_issues, resolved_issues, outstanding_issues, median_days_to_resolve
    from public.team_performance$$,
  $$values ('City Engineer Office', 2, 1, 1, 5.0::numeric)$$,
  'team performance counts the reports an agency''s work has touched'
);

select results_eq(
  $$select component_type::text, average_days, resolved_count from public.repair_time_by_component$$,
  $$values ('inlets', 5.0::numeric, 1)$$,
  'repair time per component type'
);

select is(
  (select count(*)::integer from public.repair_trend(30)),
  1,
  'the trend has one point per day with a resolved report'
);

select is(
  (select sum(report_count)::integer from public.report_counts_by_category),
  (select count(*)::integer from public.reports where review_status <> 'rejected'),
  'category counts add up to every report staff have not rejected'
);

select is(
  (select sum(report_count)::integer from public.report_counts_by_zone),
  (select count(*)::integer from public.reports where zone is not null and review_status <> 'rejected'),
  'zone counts add up to every unrejected report with a zone'
);

select is(
  (select count(*)::integer from public.latest_report_per_component),
  (select count(distinct component_id)::integer from public.reports where review_status <> 'rejected'),
  'one latest report per component'
);

-- Work dated before its report is a wrong link, not a fast fix.
reset role;
update public.reports set resolved_at = created_at - interval '1 day'
where id = '00000000-0000-4000-b000-000000000001';
select is_empty(
  $$select 1 from public.report_repair_days where id = '00000000-0000-4000-b000-000000000001'$$,
  'maintenance dated before its report is left out of repair times'
);
update public.reports set resolved_at = created_at + interval '5 days'
where id = '00000000-0000-4000-b000-000000000001';
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$update public.report_repair_days set category = 'outlets'$$,
  '42501', null,
  'the read models are read-only'
);

select throws_ok(
  $$select * from public.maintenance_history('I-0')$$,
  '42501', null,
  'visitors cannot read maintenance history with staff names'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok(
  $$select * from public.maintenance_history('I-0')$$,
  '42501', 'Only agency staff can see maintenance history.',
  'citizens cannot either'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select results_eq(
  $$select agency_name, performed_by_name, status::text from public.maintenance_history('I-0')$$,
  $$values ('City Engineer Office', 'Sam Staff', 'resolved')$$,
  'staff see who did the work, including colleagues'
);

reset role;
select * from finish();
rollback;
