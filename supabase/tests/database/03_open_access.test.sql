-- Reports, barangays, storage and realtime (checklist step 3).
-- Impersonation pattern: see 01_baseline.test.sql.
-- Seeded report ...b000-000000000003 is pending on ISD-1, filed by citizen ...0003.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

-- Signed-out visitors -------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

update public.reports set description = 'vandalised'
where id = '00000000-0000-4000-b000-000000000003';
delete from public.reports where id = '00000000-0000-4000-b000-000000000003';

select is(
  (select description from public.reports where id = '00000000-0000-4000-b000-000000000003'),
  'Storm drain overflowing after light rain.',
  'anon cannot edit or delete a report'
);

select lives_ok(
  $$insert into public.reports (category, description, status, component_id, long, lat, reporter_name)
    values ('inlets', 'Blocked', 'pending', 'I-0', 123.9154, 10.3601, 'Walk-in')$$,
  'anon can file a pending report'
);

select throws_ok(
  $$insert into public.reports (category, status, component_id) values ('inlets', 'resolved', 'I-0')$$,
  '42501', null,
  'anon cannot file a report as already resolved'
);

select throws_ok(
  $$insert into public.reports (category, status, component_id, user_id)
    values ('inlets', 'pending', 'I-0', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'anon cannot file a report under someone else''s account'
);

select isnt_empty(
  'select name from public.barangay_boundaries',
  'anon can read barangay boundaries'
);

select throws_ok(
  $$update public.barangay_boundaries set name = 'Nowhere'$$,
  '42501', null,
  'anon cannot change barangay boundaries'
);

select throws_ok(
  $$select * from public.get_component_by_category('profiles')$$,
  '22023', null,
  'get_component_by_category refuses tables other than the four component tables'
);

select isnt_empty(
  $$select * from public.get_component_by_category('inlets')$$,
  'get_component_by_category still lists inlets'
);

-- Citizens ------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

update public.reports set status = 'resolved'
where id = '00000000-0000-4000-b000-000000000003';

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000003'),
  'pending',
  'a citizen cannot change a report, even their own'
);

select lives_ok(
  $$insert into public.reports (category, status, component_id, user_id)
    values ('inlets', 'pending', 'I-0', '00000000-0000-4000-a000-000000000003')$$,
  'a citizen can file a report under their own account'
);

select throws_ok(
  $$insert into public.barangay_boundaries (name, boundary)
    values ('Fake', 'POLYGON((0 0, 0 1, 1 1, 0 0))')$$,
  '42501', null,
  'a citizen cannot add barangay boundaries'
);

-- Staff ---------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

update public.reports set status = 'in-progress'
where id = '00000000-0000-4000-b000-000000000003';

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000003'),
  'in-progress',
  'staff can change a report''s status'
);

delete from public.reports where id = '00000000-0000-4000-b000-000000000003';

select isnt_empty(
  $$select 1 from public.reports where id = '00000000-0000-4000-b000-000000000003'$$,
  'not even staff can delete a report'
);

-- Structure -----------------------------------------------------------------

reset role;

select isnt_empty(
  $$select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'$$,
  'reports changes are published to realtime'
);

select is_empty(
  $$select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE'
      and qual like '%ReportImage%'$$,
  'nobody can overwrite a report photo'
);

select hasnt_table('public', 'report_comments', 'report_comments is gone');

select * from finish();
rollback;
