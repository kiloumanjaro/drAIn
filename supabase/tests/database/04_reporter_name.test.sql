-- The "show my name on reports" setting (checklist step 3b).
-- Impersonation pattern: see 01_baseline.test.sql.
-- Seeded: citizen ...0003 (Cora Citizen) shows her name; citizen2 ...0004
-- (Carl Citizen) hides his.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select is(
  (select reporter_name from public.reports where user_id = '00000000-0000-4000-a000-000000000004'),
  'Anonymous',
  'a hidden name is not stored on the report'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

insert into public.reports (id, category, status, component_id, user_id, reporter_name)
values ('00000000-0000-4000-b000-0000000000aa', 'inlets', 'pending', 'I-0',
        '00000000-0000-4000-a000-000000000003', 'Somebody Else');

select is(
  (select reporter_name from public.reports where id = '00000000-0000-4000-b000-0000000000aa'),
  'Cora Citizen',
  'a signed-in reporter''s name comes from their profile, not the client'
);

select lives_ok(
  $$update public.profiles set show_name_on_reports = false
    where id = '00000000-0000-4000-a000-000000000003'$$,
  'a user can turn the setting off themselves'
);

select is_empty(
  $$select 1 from public.reports
    where user_id = '00000000-0000-4000-a000-000000000003' and reporter_name <> 'Anonymous'$$,
  'turning it off hides the name on their existing reports'
);

insert into public.reports (id, category, status, component_id, user_id)
values ('00000000-0000-4000-b000-0000000000ab', 'inlets', 'pending', 'I-0',
        '00000000-0000-4000-a000-000000000003');

select is(
  (select reporter_name from public.reports where id = '00000000-0000-4000-b000-0000000000ab'),
  'Anonymous',
  'new reports stay anonymous while the setting is off'
);

update public.profiles set show_name_on_reports = true, full_name = 'Cora C.'
where id = '00000000-0000-4000-a000-000000000003';

select is_empty(
  $$select 1 from public.reports
    where user_id = '00000000-0000-4000-a000-000000000003' and reporter_name <> 'Cora C.'$$,
  'turning it back on shows their current name on every report'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

insert into public.reports (id, category, status, component_id, reporter_name)
values ('00000000-0000-4000-b000-0000000000ac', 'inlets', 'pending', 'I-0', 'Walk-in Wendy');

select is(
  (select reporter_name from public.reports where id = '00000000-0000-4000-b000-0000000000ac'),
  'Walk-in Wendy',
  'an anonymous reporter keeps the name they typed'
);

reset role;

select col_default_is(
  'public', 'profiles', 'show_name_on_reports', 'true',
  'names are shown unless someone opts out'
);

select * from finish();
rollback;
