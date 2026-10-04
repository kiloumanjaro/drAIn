-- When a report's photo was taken and how far from the component are private
-- (migration private_report_details): beside the reporter's name they say
-- where someone was, and when. Staff and the reporter read them through
-- report_private_details, which no longer says who filed a report. No client
-- reads which staff member did a piece of maintenance.
-- Impersonation pattern: see 01_baseline.test.sql. Seeded report
-- ...b000-000000000003 was filed by citizen ...0003 with a photo position;
-- ...b000-000000000002 by ...0004.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$select photo_taken_at from public.reports$$, '42501', null,
  'a visitor cannot read when a report''s photo was taken');
select throws_ok($$select photo_distance_m from public.reports$$, '42501', null,
  'or how far from the component');
select lives_ok($$select photo_check from public.reports$$,
  'the verdict those produce stays public');
select throws_ok(
  $$select * from public.report_private_details(array['00000000-0000-4000-b000-000000000003'::uuid])$$,
  '42501', null,
  'a visitor may not call report_private_details'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select throws_ok($$select photo_taken_at, photo_distance_m from public.reports$$, '42501', null,
  'a signed-in user cannot read them from the table either');
select throws_ok($$select performed_by from public.maintenance$$, '42501', null,
  'or which staff member did a piece of maintenance');
select isnt_empty(
  $$select id, component_name, agency_id, status from public.maintenance$$,
  'the rest of a maintenance record stays readable'
);
select results_eq(
  $$select id, is_mine from public.report_private_details(array[
      '00000000-0000-4000-b000-000000000002'::uuid,
      '00000000-0000-4000-b000-000000000003'::uuid])$$,
  $$values ('00000000-0000-4000-b000-000000000002'::uuid, true)$$,
  'a citizen gets the details of their own reports only'
);

-- Staff ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select results_eq(
  $$select id, is_mine, photo_distance_m is not null, photo_taken_at is not null
    from public.report_private_details(array[
      '00000000-0000-4000-b000-000000000002'::uuid,
      '00000000-0000-4000-b000-000000000003'::uuid]) order by id$$,
  $$values ('00000000-0000-4000-b000-000000000002'::uuid, false, false, false),
           ('00000000-0000-4000-b000-000000000003'::uuid, false, true, true)$$,
  'staff get every report asked for, with the photo''s age and distance'
);
select throws_ok(
  $$select user_id from public.report_private_details(array['00000000-0000-4000-b000-000000000003'::uuid])$$,
  '42703', null,
  'but not who filed it'
);
select throws_ok(
  $$select * from public.report_private_details(
      (select array_agg(gen_random_uuid()) from generate_series(1, 101)))$$,
  '22023', null,
  'more than 100 reports at a time is refused'
);
select is_empty(
  $$select * from public.report_private_details('{}'::uuid[])$$,
  'an empty list returns nothing'
);

reset role;

select ok(
  not has_column_privilege('anon', 'public.reports', 'photo_taken_at', 'SELECT')
    and not has_column_privilege('anon', 'public.reports', 'photo_distance_m', 'SELECT')
    and not has_column_privilege('authenticated', 'public.reports', 'photo_taken_at', 'SELECT')
    and not has_column_privilege('authenticated', 'public.reports', 'photo_distance_m', 'SELECT'),
  'neither column is granted to a client role (realtime leaves them out too)'
);
select ok(
  not has_table_privilege('authenticated', 'public.maintenance', 'SELECT')
    and not has_column_privilege('authenticated', 'public.maintenance', 'performed_by', 'SELECT')
    and has_column_privilege('authenticated', 'public.maintenance', 'evidence_image', 'SELECT'),
  'maintenance is granted to signed-in users by column, without performed_by'
);

-- The diff tool drops and recreates a view whose columns change; a recreated
-- view must not come back running with its owner's rights.
select is(
  (select string_agg(c.relname, ', ' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and not coalesce(c.reloptions::text[] @> array['security_invoker=true'], false)),
  null,
  'every public view runs with the caller''s rights'
);

select * from finish();
rollback;
