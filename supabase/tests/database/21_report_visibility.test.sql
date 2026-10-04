-- Rejected reports are hidden by the database, not only by the app's queries
-- (migration hide_rejected_reports): staff and the reporter still read them,
-- nobody else does. A photo stays undeletable while anything points at it,
-- whether or not the uploader can see the row that does. nearest_components
-- caps its radius and row count.
-- Impersonation pattern: see 01_baseline.test.sql. Seeded reports:
-- ...b000-000000000005 rejected (no owner), ...b000-000000000001 by citizen
-- (...0003). Seeded maintenance ...c000-000000000001.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

-- A rejected report of citizen's own, with a photo they uploaded.
insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-d000-000000000001.jpg', '00000000-0000-4000-a000-000000000003'),
  ('ReportImage', 'public/00000000-0000-4000-d000-000000000002.jpg', '00000000-0000-4000-a000-000000000002'),
  ('ReportImage', 'public/00000000-0000-4000-d000-000000000003.jpg', '00000000-0000-4000-a000-000000000003');
update public.reports
set review_status = 'rejected', review_note = 'Not a drainage problem.',
    image = 'public/00000000-0000-4000-d000-000000000001.jpg'
where id = '00000000-0000-4000-b000-000000000001';
insert into public.maintenance_reviews (maintenance_id, reviewer_id, reviewer_kind, verdict, note, evidence_image)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000002', 'staff',
        'disputed', 'Still blocked.', 'public/00000000-0000-4000-d000-000000000002.jpg');

-- Signed out --------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is_empty(
  $$select id from public.reports where id = '00000000-0000-4000-b000-000000000005'$$,
  'a visitor cannot fetch a rejected report by id'
);
select is(
  (select count(*)::int from public.reports where review_status = 'rejected'),
  0,
  'and cannot list rejected reports'
);
select isnt_empty(
  $$select id from public.reports where id = '00000000-0000-4000-b000-000000000003'$$,
  'a visitor still reads the other reports'
);
select isnt_empty(
  $$select id from public.latest_report_per_component$$,
  'and the map''s latest-report view'
);
select is(
  (select count(*)::int from public.nearest_components('storm_drains', 10.3145439635574, 123.923200288885, 1e9, 1000000)),
  20,
  'nearest_components returns at most 20 rows whatever is asked'
);
select is_empty(
  $$select * from public.nearest_components('storm_drains', 0, 0, 1e9)$$,
  'and looks no further than 500 m'
);

-- Another citizen -----------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is_empty(
  $$select id from public.reports where review_status = 'rejected'$$,
  'a signed-in citizen cannot read other people''s rejected reports'
);

-- The reporter ----------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select results_eq(
  $$select id from public.reports where review_status = 'rejected'$$,
  $$values ('00000000-0000-4000-b000-000000000001'::uuid)$$,
  'the reporter reads their own rejected report (and only theirs)'
);
select throws_ok(
  $$select user_id from public.reports$$,
  '42501', null,
  'without gaining the right to read who filed a report'
);

-- Staff -----------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.reports where review_status = 'rejected'),
  2,
  'staff read every rejected report'
);

reset role;

select policy_cmd_is('public', 'reports',
  'Anyone reads reports staff have not rejected', 'SELECT',
  'the read policy on reports is the one that hides rejected rows');
select ok(
  has_function_privilege('anon', 'private.current_agency_id()', 'execute')
  and has_function_privilege('authenticated', 'private.current_agency_id()', 'execute'),
  'the helper that policy calls is granted to every API role, not left to PUBLIC'
);
select ok(
  not has_function_privilege('anon', 'private.is_admin()', 'execute')
  and not has_function_privilege('authenticated', 'private.is_admin()', 'execute'),
  'is_admin is not callable by clients'
);
select ok(
  has_function_privilege('anon', 'public.nearest_components(public.component_type, double precision, double precision, double precision, integer)', 'execute'),
  'visitors may call nearest_components'
);

-- Photos something points at cannot be deleted -----------------------------------------
-- Same approach as 19_correctness_fixes.test.sql: see the note there.

create function pg_temp.try_delete(as_user uuid, bucket text, obj text) returns text
language plpgsql as $fn$
declare affected int;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', as_user, 'role', 'authenticated')::text, true);
  delete from storage.objects o where o.bucket_id = bucket and o.name = obj;
  get diagnostics affected = row_count;
  reset role;
  return case when affected > 0 then 'allowed' else 'blocked' end;
exception when insufficient_privilege then
  return case when sqlerrm like 'Direct deletion%' then 'allowed'
              else 'error: ' || sqlerrm end;
end $fn$;

select case
  when (select t.tgtype & 1 = 0 from pg_trigger t
        where t.tgrelid = 'storage.objects'::regclass
          and t.tgfoid = to_regproc('storage.protect_delete'))
  then skip('the storage delete guard fires per statement here', 3)
  else collect_tap(
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000003',
                          'ReportImage', 'public/00000000-0000-4000-d000-000000000001.jpg'),
       'blocked', 'the photo of a rejected report cannot be deleted by its uploader'),
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000002',
                          'ReportImage', 'public/00000000-0000-4000-d000-000000000002.jpg'),
       'blocked', 'nor can the photo a maintenance review cites'),
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000003',
                          'ReportImage', 'public/00000000-0000-4000-d000-000000000003.jpg'),
       'allowed', 'an upload nothing points at still can')
  )
end;

select * from finish();
rollback;
