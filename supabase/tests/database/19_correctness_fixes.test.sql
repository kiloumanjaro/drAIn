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

select plan(12);

-- record_maintenance -----------------------------------------------------------

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

reset role;
-- Supabase guards storage.objects against direct SQL deletes; the real path
-- is the Storage API, which runs the same RLS policies these tests check.
-- pgTAP speaks SQL, so park that guard for this rolled-back transaction
-- (it doesn't exist on the plain-Postgres harness, hence the lookup).
do $$
declare guard text;
begin
  select tgname into guard from pg_trigger
    where tgrelid = 'storage.objects'::regclass
      and tgfoid = to_regproc('storage.protect_delete');
  if guard is not null then
    execute format('alter table storage.objects disable trigger %I', guard);
  end if;
end $$;

-- Photos: one referenced by the maintenance above, one orphaned (upload whose
-- report insert failed), one belonging to someone else.
insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000002.jpg', '00000000-0000-4000-a000-000000000002'),
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000003.jpg', '00000000-0000-4000-a000-000000000003'),
  ('ReportImage', 'public/00000000-0000-4000-c000-000000000004.jpg', '00000000-0000-4000-a000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$delete from storage.objects
    where bucket_id = 'ReportImage' and name = 'public/00000000-0000-4000-c000-000000000003.jpg'$$,
  'the uploader removes their own fresh, unreferenced photo'
);

select is_empty(
  $$select 1 from storage.objects
    where name = 'public/00000000-0000-4000-c000-000000000003.jpg'$$,
  'and it is gone, restoring their daily allowance'
);

-- RLS makes a refused DELETE affect zero rows rather than raise.
delete from storage.objects
  where bucket_id = 'ReportImage' and name = 'public/00000000-0000-4000-c000-000000000004.jpg';
select isnt_empty(
  $$select 1 from storage.objects
    where name = 'public/00000000-0000-4000-c000-000000000004.jpg'$$,
  'someone else''s photo cannot be deleted'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

delete from storage.objects
  where bucket_id = 'ReportImage' and name = 'public/00000000-0000-4000-c000-000000000002.jpg';
select isnt_empty(
  $$select 1 from storage.objects
    where name = 'public/00000000-0000-4000-c000-000000000002.jpg'$$,
  'a photo a maintenance record references cannot be deleted, even by its uploader'
);

-- Avatars -----------------------------------------------------------------------

reset role;
insert into storage.objects (bucket_id, name, owner_id) values
  ('Avatars', '00000000-0000-4000-a000-000000000002/avatar.jpg', '00000000-0000-4000-a000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

delete from storage.objects
  where bucket_id = 'Avatars' and name = '00000000-0000-4000-a000-000000000002/avatar.jpg';
select isnt_empty(
  $$select 1 from storage.objects
    where name = '00000000-0000-4000-a000-000000000002/avatar.jpg'$$,
  'another user''s avatar cannot be deleted'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok(
  $$delete from storage.objects
    where bucket_id = 'Avatars' and name = '00000000-0000-4000-a000-000000000002/avatar.jpg'$$,
  'users remove their own avatar'
);

select is_empty(
  $$select 1 from storage.objects
    where name = '00000000-0000-4000-a000-000000000002/avatar.jpg'$$,
  'and it is gone'
);

select * from finish();
rollback;
