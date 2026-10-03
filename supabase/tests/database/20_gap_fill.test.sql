-- The 10-reports-a-day boundary in check_report_submission. The hourly cap
-- (5 for signed-in users) is covered in 10_report_trust.test.sql, but the
-- daily cap never was: inside one transaction now() is frozen, so the only
-- way to reach it is to backdate earlier submissions past the hour window,
-- which is done here as the table owner. report_sources' FK to reports is
-- deferred, so placeholder report ids are fine inside this transaction.
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

-- Citizen2 (...0004) filed 9 reports earlier today, all outside the last
-- hour, so the hourly count is 0 and only the daily count is in play.
insert into private.report_sources (report_id, reporter_key, created_at)
select gen_random_uuid(),
       'user:00000000-0000-4000-a000-000000000004',
       now() - interval '3 hours'
from generate_series(1, 9);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select lives_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-50', '00000000-0000-4000-a000-000000000004')$$,
  'the tenth report of the day is still allowed'
);

select throws_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-51', '00000000-0000-4000-a000-000000000004')$$,
  'P0001', 'You have sent a lot of reports recently. Please try again later.',
  'the eleventh report of the day is refused, even with the hour wide open'
);

-- The window slides: submissions older than a day no longer count.
reset role;
insert into private.report_sources (report_id, reporter_key, created_at)
select gen_random_uuid(),
       'user:00000000-0000-4000-a000-000000000003',
       now() - interval '25 hours'
from generate_series(1, 10);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$insert into public.reports (category, component_id, user_id)
    values ('storm_drains', 'ISD-52', '00000000-0000-4000-a000-000000000003')$$,
  'yesterday''s ten reports do not block today''s first'
);

select * from finish();
rollback;
