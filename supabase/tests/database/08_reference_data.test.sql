-- Flood results and components (checklist step 7).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

select hasnt_table('public', '5YR', 'the eight per-period flood tables are gone');

select results_eq(
  $$select count(distinct return_period)::integer, min(n)::integer, max(n)::integer
    from (select return_period, count(*) n from public.flood_results group by 1) x$$,
  $$values (8, 1369, 1369)$$,
  'flood_results holds all eight return periods, 1,369 nodes each'
);

select throws_ok(
  $$insert into public.flood_results
    values (7, 'I-0', 'High', 1, 1, 1, 30, 1, 1, 40, 1)$$,
  '23514', null,
  'only the modelled return periods are accepted'
);

select results_eq(
  $$select type::text, count(*)::integer from public.components group by 1 order by 1$$,
  $$values ('inlets', 138), ('man_pipes', 142), ('outlets', 44), ('storm_drains', 1231)$$,
  'components holds every inlet, pipe, outlet and storm drain'
);

select results_eq(
  $$select name from public.nearest_components('storm_drains', 10.3145439635574, 123.923200288885)$$,
  $$values ('ISD-1'), ('ISD-2'), ('ISD-3')$$,
  'nearest_components returns the closest of that type, nearest first'
);

select is_empty(
  $$select * from public.nearest_components('inlets', 10.3145439635574, 123.923200288885, 1)$$,
  'nothing comes back outside the radius'
);

select fk_ok('public', 'reports', 'component_id', 'public', 'components', 'name',
  'a report points at a real component');
select fk_ok('public', 'maintenance', 'component_name', 'public', 'components', 'name',
  'maintenance points at a real component');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$insert into public.reports (category, component_id) values ('inlets', 'NO-SUCH-THING')$$,
  '23503', null,
  'a report on a component that does not exist is refused'
);

select throws_ok(
  $$delete from public.flood_results$$,
  '42501', null,
  'visitors cannot change flood results'
);

select is(
  (select count(*)::integer from public.flood_results where return_period = 5),
  1369,
  'visitors can read flood results'
);

reset role;
select * from finish();
rollback;
