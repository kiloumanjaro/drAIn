-- Storage and report photos (migration photo_storage_rules): nobody can list
-- a bucket, uploads are JPEGs under the app's names only, a report may only
-- point at a photo its reporter uploaded, and a report's category and map
-- position come from its component. The Storage API sets owner_id from the
-- caller's token; the inserts below set it themselves.
-- scripts/check-write-paths.mjs exercises the same rules through the real
-- Storage API. Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(24);

insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-f000-000000000001.jpg', '00000000-0000-4000-a000-000000000003'),
  ('ReportImage', 'public/00000000-0000-4000-f000-000000000002.jpg', '00000000-0000-4000-a000-000000000004'),
  ('Avatars', '00000000-0000-4000-a000-000000000003/avatar.jpg', '00000000-0000-4000-a000-000000000003'),
  ('Avatars', '00000000-0000-4000-a000-000000000004/avatar.jpg', '00000000-0000-4000-a000-000000000004');

-- Listing -----------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is(
  (select count(*)::int from storage.objects),
  0,
  'a visitor can list neither bucket'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select results_eq(
  $$select name from storage.objects where bucket_id = 'ReportImage' order by name$$,
  $$values ('public/00000000-0000-4000-f000-000000000001.jpg')$$,
  'a signed-in user sees only the report photos they uploaded'
);
select results_eq(
  $$select name from storage.objects where bucket_id = 'Avatars' order by name$$,
  $$values ('00000000-0000-4000-a000-000000000003/avatar.jpg')$$,
  'and only their own avatar folder, so user ids are not listed'
);

-- Names ---------------------------------------------------------------------------

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0b01.png', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'a report photo that is not named .jpg is refused'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0b02.html', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'so the bucket cannot host a web page'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0b03.svg', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'or an SVG'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('Avatars', '00000000-0000-4000-a000-000000000003/other.jpg', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'an avatar under any name but avatar.jpg is refused'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('Avatars', '00000000-0000-4000-a000-000000000003/deep/avatar.jpg', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'at any depth'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('Avatars', '00000000-0000-4000-a000-000000000002/avatar.jpg', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'and so is one in someone else''s folder'
);
select lives_ok(
  $$update storage.objects set metadata = '{"size": 1}'::jsonb
    where bucket_id = 'Avatars' and name = '00000000-0000-4000-a000-000000000003/avatar.jpg'$$,
  'a user replaces their own avatar (the upsert the app does)'
);
select throws_ok(
  $$update storage.objects set name = '00000000-0000-4000-a000-000000000003/renamed.jpg'
    where bucket_id = 'Avatars' and name = '00000000-0000-4000-a000-000000000003/avatar.jpg'$$,
  '42501', null,
  'but cannot rename it to something else'
);

-- A report's photo ------------------------------------------------------------------

select lives_ok(
  $$insert into public.reports (id, category, component_id, user_id, image)
    values ('00000000-0000-4000-e000-0000000000a1', 'storm_drains', 'ISD-60',
            '00000000-0000-4000-a000-000000000003',
            'public/00000000-0000-4000-f000-000000000001.jpg')$$,
  'a report may point at a photo its reporter uploaded'
);
select throws_ok(
  $$insert into public.reports (category, component_id, user_id, image)
    values ('storm_drains', 'ISD-61', '00000000-0000-4000-a000-000000000003',
            'public/00000000-0000-4000-f000-000000000002.jpg')$$,
  '22023', 'The photo must be uploaded through the app.',
  'not at someone else''s photo'
);
select throws_ok(
  $$insert into public.reports (category, component_id, user_id, image)
    values ('storm_drains', 'ISD-61', '00000000-0000-4000-a000-000000000003',
            'public/00000000-0000-4000-f000-0000000000ff.jpg')$$,
  '22023', 'The photo must be uploaded through the app.',
  'not at a name with nothing uploaded under it yet'
);
select throws_ok(
  $$insert into public.reports (category, component_id, user_id, image)
    values ('storm_drains', 'ISD-61', '00000000-0000-4000-a000-000000000003',
            '../Avatars/00000000-0000-4000-a000-000000000003/avatar.jpg')$$,
  '22023', 'The photo must be uploaded through the app.',
  'and not at a path outside the app''s naming'
);
select lives_ok(
  $$insert into public.reports (id, category, component_id, user_id)
    values ('00000000-0000-4000-e000-0000000000a2', 'storm_drains', 'ISD-62',
            '00000000-0000-4000-a000-000000000003')$$,
  'a report without a photo is still accepted by the database'
);

-- A report's component ----------------------------------------------------------------

select throws_ok(
  $$insert into public.reports (category, user_id)
    values ('storm_drains', '00000000-0000-4000-a000-000000000003')$$,
  '22023', 'Say which inlet, outlet, pipe or storm drain the report is about.',
  'a report through the API has to name a component'
);

insert into public.reports (id, category, component_id, user_id, lat, long)
values ('00000000-0000-4000-e000-0000000000a3', 'inlets', 'ISD-63',
        '00000000-0000-4000-a000-000000000003', 1.5, 2.5);

select is(
  (select category::text from public.reports where id = '00000000-0000-4000-e000-0000000000a3'),
  'storm_drains',
  'the category is the component''s type, whatever the client sent'
);
select results_eq(
  $$select r.lat, r.long from public.reports r where r.id = '00000000-0000-4000-e000-0000000000a3'$$,
  $$select st_y(c.location::geometry), st_x(c.location::geometry)
    from public.components c where c.name = 'ISD-63'$$,
  'and the report sits on the component, not where the client said'
);
select isnt(
  (select zone from public.reports where id = '00000000-0000-4000-e000-0000000000a3'),
  null,
  'so its barangay is the component''s'
);

-- Direct sessions (seeds, the SQL editor) are not held to these ---------------------------

reset role;
set local request.jwt.claims = '';

select lives_ok(
  $$insert into public.reports (category, component_id, image)
    values ('inlets', 'I-20', 'public/seed-99.jpg')$$,
  'a direct database session may still seed a report with any photo path'
);

select ok(
  not has_function_privilege('authenticated', 'private.owns_report_photo(text)', 'execute'),
  'owns_report_photo is not callable by clients'
);
select is(
  (select string_agg(policyname, ', ' order by policyname) from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
      and roles && array['public', 'anon']::name[]),
  null,
  'no storage read policy applies to signed-out visitors'
);
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE'
      and qual like '%ReportImage%'),
  0,
  'report photos still cannot be overwritten'
);

select * from finish();
rollback;
