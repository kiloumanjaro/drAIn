-- Limits, photo checks and staff review on citizen reports (trust step 1).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

-- A citizen files a report on ISD-10, with a photo taken right there, and
-- tries to mark it confirmed and to pick its own photo distance.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

insert into public.reports (id, category, component_id, user_id, review_status, photo_distance_m, photo_lat, photo_lon)
select '00000000-0000-4000-e000-000000000001', 'storm_drains', c.name,
       '00000000-0000-4000-a000-000000000003', 'confirmed', 0,
       st_y(c.location::geometry), st_x(c.location::geometry)
from public.components c where c.name = 'ISD-10';

select is(
  (select review_status::text from public.reports where id = '00000000-0000-4000-e000-000000000001'),
  'unreviewed',
  'a new report is always unreviewed, whatever the client sends'
);

select is(
  (select photo_check::text from public.reports where id = '00000000-0000-4000-e000-000000000001'),
  'match',
  'a photo taken at the component is a match'
);

insert into public.reports (id, category, component_id, user_id, photo_lat, photo_lon, photo_distance_m)
values ('00000000-0000-4000-e000-000000000002', 'storm_drains', 'ISD-11',
        '00000000-0000-4000-a000-000000000003', 10.40, 123.99, 0);

select results_eq(
  $$select photo_check::text, photo_distance_m > 100 from public.reports
    where id = '00000000-0000-4000-e000-000000000002'$$,
  $$values ('mismatch', true)$$,
  'a photo taken far away is a mismatch, and the distance is measured, not taken from the client'
);

select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-10', '00000000-0000-4000-a000-000000000003')$$,
  'P0001', null,
  'a second open report on the same component from the same person is refused'
);

-- Three more fill the hourly allowance of five.
insert into public.reports (category, component_id, user_id)
select 'storm_drains', 'ISD-' || n, '00000000-0000-4000-a000-000000000003'
from generate_series(12, 14) n;

select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-15', '00000000-0000-4000-a000-000000000003')$$,
  'P0001', 'You have sent a lot of reports recently. Please try again later.',
  'a sixth report within the hour is refused'
);

-- Someone else reporting the same drain is corroboration, not a duplicate.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select lives_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-10', '00000000-0000-4000-a000-000000000004')$$,
  'a different person may report the same component'
);

-- Signed out: limited per address.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.headers = '{"x-real-ip":"203.0.113.9"}';

insert into public.reports (category, component_id)
select 'storm_drains', 'ISD-' || n from generate_series(20, 22) n;

select throws_ok(
  $$insert into public.reports (category, component_id) values ('storm_drains', 'ISD-23')$$,
  'P0001', null,
  'a fourth signed-out report from one address within the hour is refused'
);

set local request.headers = '{"x-real-ip":"198.51.100.4"}';

select lives_ok(
  $$insert into public.reports (category, component_id) values ('storm_drains', 'ISD-23')$$,
  'another address is not held back by the first'
);

select throws_ok(
  $$select * from private.report_sources$$,
  '42501', null,
  'visitors cannot see who sent which report'
);

-- Staff review.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok(
  $$select public.review_report('00000000-0000-4000-e000-000000000002', 'rejected', 'spam')$$,
  '42501', null,
  'a citizen cannot review reports'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select throws_ok(
  $$select public.review_report('00000000-0000-4000-e000-000000000002', 'rejected')$$,
  '22023', null,
  'rejecting a report needs a reason'
);

select is(
  (select report_count from public.report_counts_by_component where component_id = 'ISD-11'),
  1,
  'before review, the report counts on the map'
);

select lives_ok(
  $$select public.review_report('00000000-0000-4000-e000-000000000002', 'rejected', 'Photo is from elsewhere.')$$,
  'staff can reject a report with a reason'
);

select is(
  (select count(*)::integer from public.report_counts_by_component where component_id = 'ISD-11'),
  0,
  'a rejected report drops out of the map counts'
);

select results_eq(
  $$select review_status::text, reviewed_by, priority::text
    from public.review_report('00000000-0000-4000-e000-000000000001', 'confirmed', null, 'high')$$,
  $$values ('confirmed', '00000000-0000-4000-a000-000000000002'::uuid, 'high')$$,
  'staff can confirm a report and correct its priority'
);

-- Maintenance leaves rejected reports alone.
select public.record_maintenance('storm_drains', 'ISD-11', 'resolved');

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-e000-000000000002'),
  'pending',
  'resolving a component does not resolve a report staff rejected'
);

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000005'),
  'pending',
  'the seeded rejected report is untouched too'
);

-- A rejected report no longer blocks its reporter from filing again.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select lives_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-30', '00000000-0000-4000-a000-000000000004')$$,
  'a second person is only held to their own allowance'
);

reset role;
select * from finish();
rollback;
