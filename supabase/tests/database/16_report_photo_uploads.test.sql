-- Report photos: only signed-in users upload (since 2026-09-29), only under
-- the random names the app makes (run plan 2.5), and only so many a day
-- (since 2026-09-30: 10 for citizens, 100 for staff). The Storage API sets
-- owner_id from the caller's token; the inserts below set it themselves.
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a10.jpg')$$,
  '42501', null,
  'a signed-out visitor cannot upload a report photo'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('Avatars', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a14.jpg')$$,
  '42501', null,
  'visitors cannot upload avatars'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a11.jpg')$$,
  'a citizen can upload a report photo under a random name'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('ReportImage', 'public/free-hosting.html')$$,
  '42501', null,
  'but not under a name of their choosing'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('ReportImage', 'elsewhere/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a12.jpg')$$,
  '42501', null,
  'or outside public/'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a13xjpg')$$,
  '42501', null,
  'the dot before the extension is a real dot'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('ReportImage', 'public/0b6f3c52-1a1e-4f7e-9d3a-2c5b8e9f0a15.png')$$,
  'staff upload maintenance evidence the same way'
);

-- The daily allowance. (Each upload is one request through the Storage API;
-- the 10 here arrive in one statement, checked once, to keep the test short.)
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    select 'ReportImage', 'public/' || gen_random_uuid() || '.jpg', '00000000-0000-4000-a000-000000000003'
    from generate_series(1, 10)$$,
  'a citizen uploads up to 10 photos a day'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('ReportImage', 'public/' || gen_random_uuid() || '.jpg', '00000000-0000-4000-a000-000000000003')$$,
  '42501', null,
  'the 11th is refused'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    select 'ReportImage', 'public/' || gen_random_uuid() || '.jpg', '00000000-0000-4000-a000-000000000002'
    from generate_series(1, 10)$$,
  'staff upload maintenance evidence too'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('ReportImage', 'public/' || gen_random_uuid() || '.jpg', '00000000-0000-4000-a000-000000000002')$$,
  'so their allowance is larger'
);

select * from finish();
rollback;
