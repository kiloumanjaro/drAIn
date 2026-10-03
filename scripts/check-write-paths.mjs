// Exercises every write the app makes through the API (report inserts,
// profile edit, joining/leaving an agency, recording maintenance) against
// the LOCAL stack, as the seeded users. Run after changing grants or
// policies: `node scripts/check-write-paths.mjs` (after `supabase db reset`;
// it files reports, so a second run hits the duplicate-report rule).
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
// A 1x1 PNG, so the bucket's image-only limit is never the reason for a
// refusal.
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
const photoName = () => `public/${crypto.randomUUID()}.png`;
const out = (label, error) =>
  console.log(error ? `FAIL ${label}: ${error.message}` : `ok   ${label}`);

// Signed out: no reports and no photo uploads (since 2026-09-29).
{
  const c = client();
  const up = await c.storage.from('ReportImage').upload(photoName(), png());
  out(
    'anon photo upload is refused',
    up.error ? null : { message: 'the upload was allowed' }
  );
  const { error } = await c.from('reports').insert({
    category: 'inlets',
    component_id: 'I-10',
    description: 'grants check',
    long: 123.9154,
    lat: 10.3601,
    reporter_name: 'Walk-in',
  });
  out(
    'anon report insert is refused',
    error ? null : { message: 'the insert was allowed' }
  );
  const t = await c
    .from('reports')
    .update({ description: 'x' })
    .eq('component_id', 'I-10');
  out(
    'anon report update is refused',
    t.error ? null : { message: 'the update was allowed' }
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

// Signed-in report insert and profile edit.
{
  const c = await signIn('citizen2@drain.local');
  const { data: u } = await c.auth.getUser();
  const up = await c.storage.from('ReportImage').upload(photoName(), png());
  out('signed-in photo upload', up.error);
  const r = await c.from('reports').insert({
    category: 'inlets',
    component_id: 'I-11',
    description: 'grants check',
    long: 123.9154,
    lat: 10.3601,
    user_id: u.user.id,
  });
  out('signed-in report insert', r.error);
  const p = await c
    .from('profiles')
    .update({ full_name: 'Citizen Two' })
    .eq('id', u.user.id)
    .select();
  out(`profile edit (${p.data?.length ?? 0} row)`, p.error);
  const j = await c.rpc('join_agency', { p_code: 'DRAIN-LOCAL-01' });
  out('join agency', j.error);
  const l = await c.rpc('leave_agency');
  out('leave agency', l.error);
}

// Staff records maintenance.
{
  const c = await signIn('staff@drain.local');
  const m = await c.rpc('record_maintenance', {
    p_component_type: 'inlets',
    p_component_name: 'I-11',
    p_status: 'in-progress',
    p_description: 'grants check',
    p_evidence_image: null,
  });
  out('record maintenance', m.error);
}
