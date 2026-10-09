-- Limits, photo checks and staff review on citizen reports (trust step 1).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

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
  $$select r.photo_check::text, d.photo_distance_m > 100
    from public.reports r
    join public.report_private_details(array[r.id]) d on d.id = r.id
    where r.id = '00000000-0000-4000-e000-000000000002'$$,
  $$values ('mismatch', true)$$,
  'a photo taken far away is a mismatch, and the distance is measured, not taken from the client'
);

select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-10', '00000000-0000-4000-a000-000000000003')$$,
  'P0001', null,
  'a second open report on the same component from the same person is refused'
);

-- A third and a fourth; one more fills the hourly allowance of five.
insert into public.reports (category, component_id, user_id)
values ('storm_drains', 'ISD-12', '00000000-0000-4000-a000-000000000003');
insert into public.reports (category, component_id, user_id)
values ('storm_drains', 'ISD-13', '00000000-0000-4000-a000-000000000003');

-- Each row of one INSERT is counted before the next is checked: here the
-- first row is the fifth, and the second is refused. The count used to be
-- written after the statement, so one request of many rows skipped the
-- limits entirely.
select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-14', '00000000-0000-4000-a000-000000000003'),
           ('storm_drains', 'ISD-16', '00000000-0000-4000-a000-000000000003')$$,
  'P0001', 'You have sent a lot of reports recently. Please try again later.',
  'rows of one statement count against the limit as they go'
);

insert into public.reports (category, component_id, user_id)
values ('storm_drains', 'ISD-14', '00000000-0000-4000-a000-000000000003');

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

select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-40', '00000000-0000-4000-a000-000000000004'),
           ('storm_drains', 'ISD-40', '00000000-0000-4000-a000-000000000004')$$,
  'P0001', 'You already have an open report on ISD-40. It will update when staff record work on it.',
  'two reports on one component in one statement are a duplicate too'
);

select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-41', '00000000-0000-4000-a000-000000000004'),
           ('storm_drains', 'ISD-42', '00000000-0000-4000-a000-000000000004')$$,
  'P0001', 'File one report at a time.',
  'the API files one report per request'
);

-- Columns only the server writes: whatever the client sends is replaced.
-- The photo is one this person uploaded (the Storage API sets owner_id).
insert into storage.objects (bucket_id, name, owner_id)
values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a31.jpg',
        '00000000-0000-4000-a000-000000000004');
insert into public.reports (id, category, component_id, user_id, image, created_at,
                            resolved_at, geocoded_status, address)
values ('00000000-0000-4000-e000-000000000031', 'storm_drains', 'ISD-31',
        '00000000-0000-4000-a000-000000000004',
        'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a31.jpg', '2000-01-01',
        now(), 'completed', 'Somewhere Else St');

select results_eq(
  $$select created_at = now(), resolved_at, geocoded_status, address, image
    from public.reports where id = '00000000-0000-4000-e000-000000000031'$$,
  $$values (true, null::timestamptz, 'pending'::text, null::text,
            'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a31.jpg'::text)$$,
  'created_at, resolved_at, geocoded_status and address are the server''s'
);

select throws_ok(
  $$insert into public.reports (category, component_id, user_id, image)
    values ('storm_drains', 'ISD-32', '00000000-0000-4000-a000-000000000004',
            'https://example.com/not-ours.png')$$,
  '22023', 'The photo must be uploaded through the app.',
  'the photo must be one the app uploaded, not any URL'
);

-- Signed out: no reports at all since 2026-09-29.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$insert into public.reports (category, component_id) values ('storm_drains', 'ISD-23')$$,
  '42501', null,
  'a signed-out visitor cannot file a report'
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

-- Table checks hold for everyone, the seed included.
reset role;
set local request.jwt.claims = '{}';

select throws_ok(
  $$insert into public.reports (category, component_id, lat, long) values ('inlets', 'I-0', 91, 123.9)$$,
  '23514', null,
  'a latitude outside -90..90 is refused'
);

select throws_ok(
  $$insert into public.reports (category, component_id, lat, long) values ('inlets', 'I-0', 10.3, 'NaN')$$,
  '23514', null,
  'so is a longitude that is not a number'
);

select throws_ok(
  $$insert into public.reports (category, component_id, description) values ('inlets', 'I-0', repeat('x', 1001))$$,
  '23514', null,
  'a description over 1000 characters is refused'
);

select * from finish();
rollback;
