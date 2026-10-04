-- Correctness fixes (migration 20261002090000): in-progress maintenance no
-- longer writes its photo into reports.resolved_image, record_maintenance
-- refuses a component_type that contradicts the component, and owners may
-- delete their own fresh, unreferenced report photo (and their own avatar),
-- which is what makes the app's cleanup after a failed save real.
-- Impersonation pattern: see 01_baseline.test.sql. Seeded open reports:
-- ...b000-000000000003 pending on ISD-1.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

-- record_maintenance -----------------------------------------------------------

-- The two evidence photos, uploaded by the staff member who records the work.
insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000001.jpg', '00000000-0000-4000-a000-000000000002'),
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000002.jpg', '00000000-0000-4000-a000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-1', 'in-progress', 'Crew on site',
                                     'public/00000000-0000-4000-c000-000000000001.jpg')$$,
  'staff record in-progress work with a photo'
);

select results_eq(
  $$select status::text, resolved_image is null, resolved_at is null from public.reports
    where id = '00000000-0000-4000-b000-000000000003'$$,
  $$values ('in-progress', true, true)$$,
  'an in-progress photo does not become the report''s "photo after the fix"'
);

select lives_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-1', 'resolved', 'Cleared',
                                     'public/00000000-0000-4000-c000-000000000002.jpg')$$,
  'the same component is later resolved with a photo'
);

select results_eq(
  $$select status::text, resolved_image from public.reports
    where id = '00000000-0000-4000-b000-000000000003'$$,
  $$values ('resolved', 'public/00000000-0000-4000-c000-000000000002.jpg')$$,
  'resolving with a photo sets it as the report''s fix photo'
);

select throws_ok(
  $$select public.record_maintenance('inlets', 'ISD-1', 'resolved')$$,
  '22023', null,
  'a component_type that contradicts the component is refused'
);

-- Deleting one's own fresh, unreferenced report photo ---------------------------
-- The Storage API is the real delete path and it enforces these policies.
-- Supabase also has a guard that stops the direct SQL deletes pgTAP speaks:
-- it fires per row, so it only ever sees a row the policy let through. A
-- delete is therefore "allowed" when the row went (plain Postgres) or the
-- guard fired (Supabase), and "blocked" when nothing happened at all.

reset role;

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
  -- The exception unwinds the SET ROLE too, so the caller is unaffected.
  return case when sqlerrm like 'Direct deletion%' then 'allowed'
              else 'error: ' || sqlerrm end;
end $fn$;

select policy_cmd_is('storage', 'objects',
  'Uploaders remove their own fresh report photo nothing uses', 'DELETE',
  'the report-photo delete policy guards DELETE');
select policy_roles_are('storage', 'objects',
  'Uploaders remove their own fresh report photo nothing uses', ARRAY['authenticated'],
  'and applies to signed-in users');
select policy_cmd_is('storage', 'objects',
  'Users remove their own avatars', 'DELETE',
  'the avatar delete policy guards DELETE');
select policy_roles_are('storage', 'objects',
  'Users remove their own avatars', ARRAY['authenticated'],
  'and applies to signed-in users too');

-- Photos: ...c000-000000000002 is referenced by the maintenance above; here
-- one orphaned (upload whose report insert failed) and one belonging to
-- someone else; plus one avatar.
insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000003.jpg', '00000000-0000-4000-a000-000000000003'),
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000004.jpg', '00000000-0000-4000-a000-000000000002'),
  ('Avatars', '00000000-0000-4000-a000-000000000002/avatar.jpg', '00000000-0000-4000-a000-000000000002');

-- If the guard here fires per statement instead of per row, outcomes can't
-- distinguish allowed from blocked; the policy checks above still hold.
select case
  when (select t.tgtype & 1 = 0 from pg_trigger t
        where t.tgrelid = 'storage.objects'::regclass
          and t.tgfoid = to_regproc('storage.protect_delete'))
  then skip('the storage delete guard fires per statement here', 5)
  else collect_tap(
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000003',
                          'ReportImage', 'public/00000000-0000-4000-c000-000000000003.jpg'),
       'allowed', 'the uploader removes their own fresh, unreferenced photo'),
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000003',
                          'ReportImage', 'public/00000000-0000-4000-c000-000000000004.jpg'),
       'blocked', 'someone else''s photo cannot be deleted'),
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000002',
                          'ReportImage', 'public/00000000-0000-4000-c000-000000000002.jpg'),
       'blocked', 'a photo a maintenance record references cannot be deleted, even by its uploader'),
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000003',
                          'Avatars', '00000000-0000-4000-a000-000000000002/avatar.jpg'),
       'blocked', 'another user''s avatar cannot be deleted'),
    is(pg_temp.try_delete('00000000-0000-4000-a000-000000000002',
                          'Avatars', '00000000-0000-4000-a000-000000000002/avatar.jpg'),
       'allowed', 'users remove their own avatar')
  )
end;

select * from finish();
rollback;
