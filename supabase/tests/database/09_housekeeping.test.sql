-- Small structural guarantees (checklist step 8).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

update public.profiles set updated_at = '2000-01-01'
where id = '00000000-0000-4000-a000-000000000003';

select ok(
  (select updated_at > now() - interval '1 minute' from public.profiles
   where id = '00000000-0000-4000-a000-000000000003'),
  'profiles.updated_at is stamped by the database, whatever the client sends'
);

select has_index('public', 'profiles', 'idx_profiles_agency_id', 'profiles.agency_id is indexed');
select has_index('public', 'reports', 'idx_reports_user_id', 'reports.user_id is indexed');

select * from finish();
rollback;
