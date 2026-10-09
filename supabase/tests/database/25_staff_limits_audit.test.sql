-- Staff actions are limited per staff member and written to an append-only
-- audit log; evidence photos must be the caller's own; names and notes have
-- a length limit (migration staff_limits_and_audit).
-- Impersonation pattern: see 01_baseline.test.sql. Seeded: ...0001 admin and
-- ...0002 staff of the City Engineer Office; ...0003 and ...0004 citizens.
-- Reports ...b000-000000000003 (pending, ISD-1) and ...b000-000000000004.
-- Maintenance ...c000-000000000001.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(31);

insert into storage.objects (bucket_id, name, owner_id) values
  ('ReportImage', 'public/00000000-0000-4000-f100-000000000001.jpg', '00000000-0000-4000-a000-000000000003');

-- The test reads the log with the owner's rights; no client can.
create function pg_temp.audit(p_action text) returns setof private.audit_log
language sql security definer as $fn$
  select * from private.audit_log where action = p_action order by id
$fn$;
create function pg_temp.audit_by(p_actor uuid) returns setof private.audit_log
language sql security definer as $fn$
  select * from private.audit_log where actor_id = p_actor order by id
$fn$;
grant execute on function pg_temp.audit(text), pg_temp.audit_by(uuid) to authenticated;

-- review_report ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select public.review_report('00000000-0000-4000-b000-000000000004', 'rejected', 'Duplicate.', 'high')$$,
  'staff reject a report'
);
select lives_ok(
  $$select public.review_report('00000000-0000-4000-b000-000000000004', 'confirmed')$$,
  'and then confirm it after all'
);
select results_eq(
  $$select details -> 'before' ->> 'review_status', details -> 'after' ->> 'review_status',
           details -> 'before' ->> 'priority', details -> 'before' ->> 'review_note',
           actor_id, target_id
    from pg_temp.audit('report.review')$$,
  $$values ('unreviewed', 'rejected', 'low', null,
            '00000000-0000-4000-a000-000000000002'::uuid, '00000000-0000-4000-b000-000000000004'),
           ('rejected', 'confirmed', 'high', 'Duplicate.',
            '00000000-0000-4000-a000-000000000002'::uuid, '00000000-0000-4000-b000-000000000004')$$,
  'each review is logged with what the report said before it, so it can be put back'
);
select throws_ok(
  $$select public.review_report('00000000-0000-4000-b000-000000000004', 'rejected', repeat('x', 1001))$$,
  '22023', 'Keep the note under 1,000 characters.',
  'a review note has a length limit'
);
select throws_ok(
  $$select public.review_report('00000000-0000-4000-b000-0000000000ff', 'confirmed')$$,
  'P0002', null,
  'a report that does not exist is still reported as such'
);
select is(
  (select count(*)::int from pg_temp.audit('report.review')),
  2,
  'refused reviews are not logged'
);

-- record_maintenance ------------------------------------------------------------------

select lives_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-1', 'resolved', 'Cleared')$$,
  'staff record finished work'
);
select results_eq(
  $$select details ->> 'component', details ->> 'status',
           details -> 'reports' -> 0 ->> 'id', details -> 'reports' -> 0 ->> 'status_before'
    from pg_temp.audit('maintenance.record')$$,
  $$values ('ISD-1', 'resolved', '00000000-0000-4000-b000-000000000003', 'pending')$$,
  'the log names each report the work closed and what it was before'
);
select throws_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-2', 'resolved', null,
                                     'public/00000000-0000-4000-f100-000000000001.jpg')$$,
  '22023', 'The photo must be uploaded through the app.',
  'evidence has to be a photo the staff member uploaded, not someone else''s'
);
select throws_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-2', 'resolved', null,
                                     '../Avatars/00000000-0000-4000-a000-000000000002/avatar.jpg')$$,
  '22023', 'The photo must be uploaded through the app.',
  'or an arbitrary path'
);
select throws_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-2', 'resolved', repeat('x', 2001))$$,
  '22023', 'Keep the description under 2,000 characters.',
  'a description has a length limit'
);

-- 30 an hour: one used above, the refused ones don't count.
select is(
  (select count(*)::int from (
     select public.record_maintenance('storm_drains', 'ISD-' || n, 'in-progress')
     from generate_series(2, 30) n) calls),
  29,
  'a staff member records up to thirty pieces of work in an hour'
);
select throws_ok(
  $$select public.record_maintenance('storm_drains', 'ISD-31', 'in-progress')$$,
  'P0001', 'You have recorded a lot of work recently. Please try again later.',
  'the thirty-first is refused'
);
select is(
  (select count(*)::int from pg_temp.audit('maintenance.record')),
  30,
  'one log row per piece of work recorded, none for the refusals'
);

-- review_maintenance ------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select public.review_maintenance(
      (select id from public.maintenance where component_name = 'ISD-1' and status = 'resolved'),
      'disputed', 'Still blocked.')$$,
  'another staff member disputes the work'
);
select results_eq(
  $$select details ->> 'verdict', details ->> 'verdict_before', details -> 'reports_reopened' ->> 0
    from pg_temp.audit('maintenance.review')$$,
  $$values ('disputed', null, '00000000-0000-4000-b000-000000000003')$$,
  'the log keeps the verdict and the reports the dispute reopened'
);
select throws_ok(
  $$select public.review_maintenance(
      (select id from public.maintenance where component_name = 'ISD-1' and status = 'resolved'),
      'disputed', 'See photo.', 'public/00000000-0000-4000-f100-000000000001.jpg')$$,
  '22023', 'The photo must be uploaded through the app.',
  'dispute evidence has to be the reviewer''s own upload too'
);
select throws_ok(
  $$select public.review_maintenance(
      (select id from public.maintenance where component_name = 'ISD-1' and status = 'resolved'),
      'disputed', repeat('x', 1001))$$,
  '22023', 'Keep the note under 1,000 characters.',
  'and its note has a length limit'
);

-- Agency membership ---------------------------------------------------------------------

select lives_ok(
  $$select public.set_member_agency('00000000-0000-4000-a000-000000000002',
      (select agency_id from public.profiles where id = '00000000-0000-4000-a000-000000000001'), 'citizen')$$,
  'an admin removes a member'
);
select results_eq(
  $$select details ->> 'role_before', details ->> 'role', details ->> 'agency_id', target_id
    from pg_temp.audit('agency.member_set')$$,
  $$values ('staff', 'citizen', null, '00000000-0000-4000-a000-000000000002')$$,
  'which is logged with the role before and after'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is((public.join_agency('WRONG-CODE-00')).id, null::uuid, 'a wrong join code joins nothing');
select is((public.join_agency('DRAIN-LOCAL-01')).name, 'City Engineer Office', 'the right one does');
select lives_ok($$select public.leave_agency()$$, 'and staff can leave again');
select results_eq(
  $$select action, details ? 'agency_id' from pg_temp.audit_by('00000000-0000-4000-a000-000000000004')$$,
  $$values ('agency.join_failed', false), ('agency.join', true), ('agency.leave', true)$$,
  'a failed try, a join and a leave are each logged, without the code'
);

-- Nobody reads or rewrites the log ---------------------------------------------------------

select throws_ok($$select * from private.audit_log$$, '42501', null,
  'a signed-in user cannot read the audit log');
select throws_ok(
  $$select private.write_audit('report.review', 'report', 'x')$$,
  '42501', null,
  'or write to it'
);

reset role;
set local request.jwt.claims = '';

select throws_ok($$update private.audit_log set action = 'x'$$, '42501',
  'The audit log is append-only.', 'not even the owner can change a row');
select throws_ok($$delete from private.audit_log$$, '42501',
  'The audit log is append-only.', 'or delete one');
select throws_ok($$truncate private.audit_log$$, '42501',
  'The audit log is append-only.', 'or empty it');

-- Names ---------------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000e1',
        'authenticated', 'authenticated', 'long-name@drain.local',
        jsonb_build_object('full_name', repeat('n', 500)));

select is(
  (select char_length(full_name) from public.profiles where id = '00000000-0000-4000-a000-0000000000e1'),
  100,
  'a very long name at sign-up is cut to 100 characters instead of failing the sign-up'
);
select throws_ok(
  $$update public.profiles set full_name = repeat('n', 101)
    where id = '00000000-0000-4000-a000-0000000000e1'$$,
  '23514', null,
  'and a profile cannot be given a longer one later'
);

select * from finish();
rollback;
