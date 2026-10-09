// Exercises every write the app makes through the API (photo and avatar
// uploads, report inserts, profile edit, joining/leaving an agency,
// recording maintenance) against the LOCAL stack, as the seeded users. Run
// after changing grants or policies: `node scripts/check-write-paths.mjs`
// (after `supabase db reset`; it files reports, so a second run hits the
// duplicate-report rule). The storage checks matter most: pgTAP can only
// imitate the Storage API, this goes through it.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  execSync('npx supabase status -o env', {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    })
);
const url = env.API_URL;
const anonKey = env.ANON_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url ?? '')) {
  throw new Error('Refusing to run against anything but the local stack.');
}
const client = () =>
  createClient(url, anonKey, { auth: { persistSession: false } });
// A 1x1 JPEG, which is what the app uploads after re-encoding a photo, so
// the bucket's type limit is never the reason for a refusal.
const jpeg = () =>
  new Blob(
    [
      Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
      ),
    ],
    { type: 'image/jpeg' }
  );
const png = () =>
  new Blob(
    [
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      ),
    ],
    { type: 'image/png' }
  );
const photoName = (ext = 'jpg') => `public/${crypto.randomUUID()}.${ext}`;

let failures = 0;
const out = (label, error) => {
  if (error) failures += 1;
  console.log(error ? `FAIL ${label}: ${error.message}` : `ok   ${label}`);
};
/** Passes when the request was refused. */
const refused = (label, result) =>
  out(label, result.error ? null : { message: 'it was allowed' });
/** Passes when the condition holds. */
const check = (label, condition, detail = 'unexpected result') =>
  out(label, condition ? null : { message: detail });

// Signed out: no reports and no photo uploads (since 2026-09-29), and no
// listing of either bucket.
{
  const c = client();
  refused(
    'anon photo upload is refused',
    await c.storage.from('ReportImage').upload(photoName(), jpeg())
  );
  refused(
    'anon report insert is refused',
    await c.from('reports').insert({
      category: 'inlets',
      component_id: 'I-10',
      description: 'grants check',
      long: 123.9154,
      lat: 10.3601,
      reporter_name: 'Walk-in',
    })
  );
  refused(
    'anon report update is refused',
    await c
      .from('reports')
      .update({ description: 'x' })
      .eq('component_id', 'I-10')
  );
}

async function signIn(email) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({
    email,
    password: 'password123',
  });
  if (error) throw error;
  return c;
}

// Names of what the signed-in checks upload, to list for afterwards.
let citizenPhoto;
let citizenId;

// Signed-in photo upload, report insert, avatar and profile edit.
{
  const c = await signIn('citizen2@drain.local');
  const { data: u } = await c.auth.getUser();
  citizenId = u.user.id;

  citizenPhoto = photoName();
  const up = await c.storage.from('ReportImage').upload(citizenPhoto, jpeg());
  out('signed-in photo upload', up.error);
  refused(
    'a photo not named .jpg is refused',
    await c.storage.from('ReportImage').upload(photoName('png'), png())
  );
  refused(
    'a non-JPEG under a .jpg name is refused by the bucket',
    await c.storage.from('ReportImage').upload(photoName(), png())
  );
  refused(
    'overwriting a report photo is refused',
    await c.storage
      .from('ReportImage')
      .upload(citizenPhoto, jpeg(), { upsert: true })
  );

  const mine = await c.storage.from('ReportImage').list('public');
  check(
    'the uploader can list their own photo',
    mine.data?.some((o) => `public/${o.name}` === citizenPhoto),
    mine.error?.message
  );

  refused(
    'a report pointing at a photo that was never uploaded is refused',
    await c.from('reports').insert({
      category: 'inlets',
      component_id: 'I-11',
      description: 'grants check',
      image: photoName(),
      user_id: citizenId,
    })
  );
  const r = await c.from('reports').insert({
    category: 'inlets',
    component_id: 'I-11',
    description: 'grants check',
    image: citizenPhoto,
    long: 123.9154,
    lat: 10.3601,
    user_id: citizenId,
  });
  out('signed-in report insert with their own photo', r.error);

  // What uploadReport does when the insert is refused: remove the photo.
  const orphan = photoName();
  await c.storage.from('ReportImage').upload(orphan, jpeg());
  const removed = await c.storage.from('ReportImage').remove([orphan]);
  check(
    'an unused fresh photo can be removed by its uploader',
    removed.data?.length === 1,
    removed.error?.message ?? 'nothing was removed'
  );
  const kept = await c.storage.from('ReportImage').remove([citizenPhoto]);
  check(
    'a photo a report points at cannot be removed',
    (kept.data?.length ?? 0) === 0,
    'it was removed'
  );

  // What updateUserProfile does: upsert <id>/avatar.jpg, twice over.
  const avatar = `${citizenId}/avatar.jpg`;
  const first = await c.storage
    .from('Avatars')
    .upload(avatar, jpeg(), { upsert: true });
  out('avatar upload', first.error);
  const second = await c.storage
    .from('Avatars')
    .upload(avatar, jpeg(), { upsert: true });
  out('avatar replace (upsert)', second.error);
  refused(
    'an avatar under another name is refused',
    await c.storage.from('Avatars').upload(`${citizenId}/other.jpg`, jpeg())
  );
  const publicAvatar = await fetch(
    c.storage.from('Avatars').getPublicUrl(avatar).data.publicUrl
  );
  check(
    'the avatar is served from its public URL',
    publicAvatar.ok,
    `HTTP ${publicAvatar.status}`
  );

  const p = await c
    .from('profiles')
    .update({ full_name: 'Citizen Two' })
    .eq('id', citizenId)
    .select();
  out(`profile edit (${p.data?.length ?? 0} row)`, p.error);
  const j = await c.rpc('join_agency', { p_code: 'DRAIN-LOCAL-01' });
  out('join agency', j.error);
  const l = await c.rpc('leave_agency');
  out('leave agency', l.error);
}

// Nobody else can list what that user uploaded; the public URL still works.
{
  const anon = client();
  const photos = await anon.storage.from('ReportImage').list('public');
  check(
    'anon cannot list report photos',
    (photos.data?.length ?? 0) === 0,
    `${photos.data?.length} listed`
  );
  const folders = await anon.storage.from('Avatars').list('');
  check(
    'anon cannot list avatar folders (user ids)',
    (folders.data?.length ?? 0) === 0,
    `${folders.data?.length} listed`
  );
  const publicPhoto = await fetch(
    anon.storage.from('ReportImage').getPublicUrl(citizenPhoto).data.publicUrl
  );
  check(
    'a report photo is served from its public URL to anyone',
    publicPhoto.ok,
    `HTTP ${publicPhoto.status}`
  );

  const other = await signIn('citizen@drain.local');
  const theirs = await other.storage.from('ReportImage').list('public');
  check(
    "another user cannot list someone else's photos",
    !theirs.data?.some((o) => `public/${o.name}` === citizenPhoto),
    'it was listed'
  );
  const avatars = await other.storage.from('Avatars').list(citizenId);
  check(
    "or someone else's avatar folder",
    (avatars.data?.length ?? 0) === 0,
    `${avatars.data?.length} listed`
  );
  refused(
    "a report pointing at someone else's photo is refused",
    await other.from('reports').insert({
      category: 'inlets',
      component_id: 'I-12',
      description: 'grants check',
      image: citizenPhoto,
      user_id: (await other.auth.getUser()).data.user.id,
    })
  );
}

// Staff records maintenance, with a photo of their own as evidence.
{
  const c = await signIn('staff@drain.local');
  const evidence = photoName();
  const up = await c.storage.from('ReportImage').upload(evidence, jpeg());
  out('staff evidence upload', up.error);
  const m = await c.rpc('record_maintenance', {
    p_component_type: 'inlets',
    p_component_name: 'I-11',
    p_status: 'in-progress',
    p_description: 'grants check',
    p_evidence_image: evidence,
  });
  out('record maintenance', m.error);
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
