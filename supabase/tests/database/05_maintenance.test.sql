-- One maintenance table, written only through record_maintenance
-- (checklist step 4). Impersonation pattern: see 01_baseline.test.sql.
-- Seeded open reports: ...b000-000000000003 pending on ISD-1,
-- ...b000-000000000002 in-progress on O-0.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

select hasnt_table('public', 'inlets_maintenance', 'the per-type maintenance tables are gone');

-- No client can read maintenance.performed_by, so the test looks it up with
-- the owner's rights.
create function pg_temp.performed_by(p_component text) returns uuid
language sql security definer as $fn$
  select performed_by from public.maintenance where component_name = p_component
$fn$;
grant execute on function pg_temp.performed_by(text) to authenticated;

-- Citizens can't record work --------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-1', 'resolved')$$,
  '42501', 'Only agency staff can record maintenance.',
  'a citizen cannot record maintenance'
);

select throws_ok(
  $$insert into public.maintenance (component_type, component_name, agency_id, performed_by, status)
    values ('inlets', 'I-0', '6b307b70-0fa4-46df-a66c-0df8a16cca3d',
            '00000000-0000-4000-a000-000000000002', 'resolved')$$,
  '42501', null,
  'nobody inserts maintenance directly, so no one can forge a record for another person'
);

select isnt_empty(
  'select 1 from public.maintenance',
  'anyone can read maintenance history'
);

-- Staff record work, and the component's reports follow ------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select is(
  (select agency_id from public.record_maintenance('storm_drains', 'ISD-1', 'in-progress', 'Crew on site')),
  '6b307b70-0fa4-46df-a66c-0df8a16cca3d'::uuid,
  'staff can record maintenance; it is filed under their own agency'
);

select results_eq(
  $$select status::text, resolved_at is null from public.reports
    where id = '00000000-0000-4000-b000-000000000003'$$,
  $$values ('in-progress', true)$$,
  'in-progress work moves a pending report to in-progress'
);

select is(
  pg_temp.performed_by('ISD-1'),
  '00000000-0000-4000-a000-000000000002'::uuid,
  'the record names the staff member who made it'
);

select lives_ok(
  $$select public.record_maintenance('outlets', 'O-0', 'resolved', null, 'public/evidence.jpg')$$,
  'staff can resolve a component'
);

select results_eq(
  $$select r.status::text, r.resolved_image, r.resolved_at = m.performed_at
    from public.reports r join public.maintenance m on m.id = r.resolved_by_maintenance_id
    where r.id = '00000000-0000-4000-b000-000000000002'$$,
  $$values ('resolved', 'public/evidence.jpg', true)$$,
  'resolving closes the open report, links it, and records when'
);

select is(
  (select status::text from public.reports where id = '00000000-0000-4000-b000-000000000001'),
  'resolved',
  'already-resolved reports on other components are untouched'
);

reset role;

select fk_ok(
  'public', 'reports', 'resolved_by_maintenance_id',
  'public', 'maintenance', 'id',
  'a report''s closing maintenance is a real foreign key'
);

select hasnt_column('public', 'reports', 'resolved_by_maintenance_type',
  'reports no longer need to say which table their maintenance is in');

select * from finish();
rollback;
