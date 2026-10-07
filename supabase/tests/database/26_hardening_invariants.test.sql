-- Properties every later migration has to keep, checked across the whole
-- schema rather than object by object: SECURITY DEFINER functions pin their
-- search_path, signed-out visitors can't call the functions that write, the
-- private tables stay private, and nobody creates their own profile as staff.
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

select is(
  (select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  null,
  'every SECURITY DEFINER function sets its own search_path'
);

select is(
  (select string_agg(f, ', ' order by f) from unnest(array[
      'public.record_maintenance(public.component_type, text, public.maintenance_status, text, text)',
      'public.review_report(uuid, public.report_review, text, public.report_priority)',
      'public.review_maintenance(uuid, public.review_verdict, text, text)',
      'public.respond_to_resolution(uuid, public.review_verdict, text)',
      'public.join_agency(text)',
      'public.leave_agency()',
      'public.set_member_agency(uuid, uuid, public.user_role)',
      'public.rotate_agency_join_code(uuid)',
      'public.agency_members(uuid)',
      'public.consume_rate_limit(text)',
      'public.my_reports()',
      'public.report_private_details(uuid[])'
    ]) f
    where has_function_privilege('anon', f, 'execute')),
  null,
  'a signed-out visitor may call none of the functions that write or return private data'
);

select is(
  (select string_agg(c.relname, ', ' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relkind = 'r'
      and (has_table_privilege('anon', c.oid, 'select')
           or has_table_privilege('authenticated', c.oid, 'select')
           or not c.relrowsecurity)),
  null,
  'no private table is readable by a client, and each has row level security on'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok($$select * from private.rate_limit_events$$, '42501', null,
  'a signed-in user cannot read the rate limiter''s bookkeeping');
select throws_ok($$select * from private.agency_join_codes$$, '42501', null,
  'or the join code hashes');
select throws_ok($$select * from private.report_sources$$, '42501', null,
  'or who filed which report');

-- The profile upsert the app does must not be a way to become staff.
select throws_ok(
  $$insert into public.profiles (id, role, agency_id)
    values ('00000000-0000-4000-a000-000000000003', 'admin', '6b307b70-0fa4-46df-a66c-0df8a16cca3d')
    on conflict (id) do update set role = excluded.role, agency_id = excluded.agency_id$$,
  '42501', null,
  'upserting your own profile as admin is refused'
);

reset role;
set local request.jwt.claims = '';

delete from public.profiles where id = '00000000-0000-4000-a000-000000000004';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select throws_ok(
  $$insert into public.profiles (id, role, agency_id)
    values ('00000000-0000-4000-a000-000000000004', 'staff', '6b307b70-0fa4-46df-a66c-0df8a16cca3d')$$,
  '42501', null,
  'and so is creating a missing profile as staff'
);
select lives_ok(
  $$insert into public.profiles (id, full_name) values ('00000000-0000-4000-a000-000000000004', 'Carl Citizen')$$,
  'creating it as a citizen is allowed'
);

reset role;
select * from finish();
rollback;
