-- Made-up app data for local development. Runs after
-- seed/reference_data.sql, so the agency and every component name used
-- below (I-0, O-0, ISD-1, C-0) already exist.
--
-- Everyone signs in with password `password123`:
--   admin@drain.local    agency staff (City Engineer Office)
--   staff@drain.local    agency staff (City Engineer Office)
--   citizen@drain.local  regular user
--   citizen2@drain.local regular user

-- The geocode webhook posts every new report to the hosted geocodeWorker
-- edge function. Locally that would call production, so switch it off.
alter table public.reports disable trigger "trigger-geocode-on-insert";

-- ---------------------------------------------------------------------------
-- Users. on_auth_user_created creates each profiles row from the metadata.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', u.full_name, 'role', u.role),
  now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@drain.local',    'Ana Admin',     'admin'),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'staff@drain.local',    'Sam Staff',     'user'),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'citizen@drain.local',  'Cora Citizen',  'user'),
  ('00000000-0000-4000-a000-000000000004'::uuid, 'citizen2@drain.local', 'Carl Citizen',  'user')
) as u (id, email, full_name, role);

-- Email sign-in needs a matching identity per user.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where email like '%@drain.local';

-- Staff are the profiles attached to an agency.
update public.profiles
set agency_id = '6b307b70-0fa4-46df-a66c-0df8a16cca3d'
where id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002');

-- ---------------------------------------------------------------------------
-- Reports, one per status and priority, placed on real components so the
-- map and the zone trigger have something to work with. Images point at
-- paths with no uploaded file, so they render as broken images.
-- ---------------------------------------------------------------------------

insert into public.reports (
  id, created_at, category, description, image, reporter_name, status,
  priority, component_id, long, lat, address, geocoded_status, user_id
) values
  ('00000000-0000-4000-b000-000000000001', now() - interval '20 days', 'inlets', 'Inlet grate clogged with leaves and plastic.', 'public/seed-1.jpg', 'Cora Citizen', 'resolved',    'medium',   'I-0',   123.915424397261, 10.360172475881,  null, 'pending', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-b000-000000000002', now() - interval '6 days',  'outlets', 'Outlet blocked, water backing up onto the road.', 'public/seed-2.jpg', 'Carl Citizen', 'in-progress', 'high', 'O-0',   123.930881802134, 10.3287419155488, null, 'pending', '00000000-0000-4000-a000-000000000004'),
  ('00000000-0000-4000-b000-000000000003', now() - interval '2 days',  'storm_drains', 'Storm drain overflowing after light rain.', 'public/seed-3.jpg', 'Cora Citizen', 'pending', 'critical', 'ISD-1', 123.923200288885, 10.3145439635574, null, 'pending', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-b000-000000000004', now() - interval '1 day',   'man_pipes', 'Manhole cover cracked.', 'public/seed-4.jpg', 'Anonymous', 'pending', 'low', 'C-0', 123.948852671767, 10.3248457286088, null, 'pending', null);

-- ---------------------------------------------------------------------------
-- Maintenance: one finished job that closed report 1, one in progress for
-- report 2, matching how lib/supabase/maintenance.ts links them.
-- ---------------------------------------------------------------------------

insert into public.inlets_maintenance (
  id, last_cleaned_at, agency_id, represented_by, in_name, status, description, addressed_report_id
) values (
  '00000000-0000-4000-c000-000000000001', now() - interval '15 days',
  '6b307b70-0fa4-46df-a66c-0df8a16cca3d', '00000000-0000-4000-a000-000000000002',
  'I-0', 'resolved', 'Cleared debris from grate.', '00000000-0000-4000-b000-000000000001'
);

insert into public.outlets_maintenance (
  id, last_cleaned_at, agency_id, represented_by, out_name, status, description, addressed_report_id
) values (
  '00000000-0000-4000-c000-000000000002', now() - interval '3 days',
  '6b307b70-0fa4-46df-a66c-0df8a16cca3d', '00000000-0000-4000-a000-000000000001',
  'O-0', 'in-progress', 'Crew dispatched; partial clearing done.', '00000000-0000-4000-b000-000000000002'
);

update public.reports
set resolved_by_maintenance_id = '00000000-0000-4000-c000-000000000001',
    resolved_by_maintenance_type = 'inlets_maintenance'
where id = '00000000-0000-4000-b000-000000000001';

update public.reports
set resolved_by_maintenance_id = '00000000-0000-4000-c000-000000000002',
    resolved_by_maintenance_type = 'outlets_maintenance'
where id = '00000000-0000-4000-b000-000000000002';
