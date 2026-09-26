-- Report status, priority and category are database enums (checklist step 5).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select enum_has_labels('public', 'report_status', array['pending', 'in-progress', 'resolved'],
  'report statuses are the three the app uses');
select enum_has_labels('public', 'report_priority', array['low', 'medium', 'high', 'critical'],
  'report priorities');
select hasnt_type('public', 'asset_point_type', 'unused enums are gone');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$insert into public.reports (category, status, component_id) values ('inlets', 'unresolved', 'I-0')$$,
  '22P02', null,
  'a status outside the list is refused'
);

select throws_ok(
  $$insert into public.reports (category, component_id, priority) values ('inlets', 'I-0', 'urgent')$$,
  '22P02', null,
  'a priority outside the list is refused'
);

select throws_ok(
  $$insert into public.reports (category, component_id) values ('inlet', 'I-0')$$,
  '22P02', null,
  'a misspelt category (singular) is refused'
);

insert into public.reports (id, category, component_id)
values ('00000000-0000-4000-b000-0000000000dd', 'inlets', 'I-0');

reset role;

select results_eq(
  $$select status::text, priority::text from public.reports
    where id = '00000000-0000-4000-b000-0000000000dd'$$,
  $$values ('pending', 'low')$$,
  'a report with no status or priority starts pending and low'
);

select col_not_null('public', 'reports', 'priority', 'every report has a priority');

select * from finish();
rollback;
