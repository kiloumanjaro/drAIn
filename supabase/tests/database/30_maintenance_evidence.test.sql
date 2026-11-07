-- The evidence photo rule lives in record_maintenance: a photo's own
-- position and time (its EXIF, sent by the app) must be within 50 m of the
-- component and 12 hours; one with neither is accepted and left unverified.
-- The four evidence columns are staff-only (no column grant).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- Photos the staff member uploaded (the Storage API sets owner_id).
insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-c000-0000000000e1.jpg', '00000000-0000-4000-a000-000000000002'),
  ('ReportImage', 'public/00000000-0000-4000-c000-0000000000e2.jpg', '00000000-0000-4000-a000-000000000002'),
  ('ReportImage', 'public/00000000-0000-4000-c000-0000000000e3.jpg', '00000000-0000-4000-a000-000000000002');

-- Points 10 m and 200 m due north of ISD-1.
create temporary table spots on commit drop as
  select st_y(st_project(c.location, 10, 0)::geometry) as lat10,
         st_x(st_project(c.location, 10, 0)::geometry) as lon10,
         st_y(st_project(c.location, 200, 0)::geometry) as lat200,
         st_x(st_project(c.location, 200, 0)::geometry) as lon200
  from public.components c where c.name = 'ISD-1';
grant select on spots to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select is(
  (select round(evidence_distance_m)::int from public.record_maintenance(
     'storm_drains', 'ISD-1', 'in-progress', 'Photo 10 m away',
     'public/00000000-0000-4000-c000-0000000000e1.jpg',
     (select lat10 from spots), (select lon10 from spots), now() - interval '1 hour')),
  10,
  'a photo 10 m from the component, an hour old, is recorded with its distance'
);

select throws_ok(
  $$select public.record_maintenance(
     'storm_drains', 'ISD-1', 'in-progress', 'Far away',
     'public/00000000-0000-4000-c000-0000000000e2.jpg',
     (select lat200 from spots), (select lon200 from spots), now() - interval '1 hour')$$,
  '22023', 'Evidence must be from within 50 m of the component.',
  'a photo 200 m away is refused'
);

select throws_ok(
  $$select public.record_maintenance(
     'storm_drains', 'ISD-1', 'in-progress', 'Old',
     'public/00000000-0000-4000-c000-0000000000e2.jpg',
     (select lat10 from spots), (select lon10 from spots), now() - interval '13 hours')$$,
  '22023', 'Evidence must be from within the last 12 hours.',
  'a photo 13 hours old is refused'
);

select is(
  (select evidence_lat is null and evidence_lon is null
      and evidence_taken_at is null and evidence_distance_m is null
   from public.record_maintenance(
     'storm_drains', 'ISD-1', 'in-progress', 'No EXIF',
     'public/00000000-0000-4000-c000-0000000000e3.jpg')),
  true,
  'a photo with neither position nor time is recorded, unverified (null evidence columns)'
);

select is(
  (select evidence_lat is null and evidence_distance_m is null
   from public.record_maintenance(
     'storm_drains', 'ISD-1', 'in-progress', 'No photo', null,
     (select lat10 from spots), (select lon10 from spots), now())),
  true,
  'a position without a photo is not kept'
);

-- The old call shape (no evidence parameters) still works: the frontend
-- deployed before this migration omits them.
select lives_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-1', 'in-progress', 'Old client')$$,
  'the five-argument call still works'
);

-- Nobody but staff (through maintenance_history, which does not show them)
-- reads the evidence columns.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  'select evidence_lat, evidence_lon, evidence_taken_at, evidence_distance_m from public.maintenance',
  '42501', null,
  'visitors cannot read where or when evidence photos were taken'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';
select throws_ok(
  'select evidence_lat, evidence_lon, evidence_taken_at, evidence_distance_m from public.maintenance',
  '42501', null,
  'nor can citizens'
);

reset role;
select * from finish();
rollback;
