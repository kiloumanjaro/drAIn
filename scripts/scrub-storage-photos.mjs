// Re-encodes every photo in the two public buckets (ReportImage, Avatars) as
// a JPEG with no metadata, in place, so its public URL keeps working.
//
// Why: the app only began stripping metadata before upload on 2026-09-30
// (lib/reports/sanitize-image.ts). Report photos uploaded before that are
// the phone's original files, and the report form required them to carry a
// GPS position, so each one says where its reporter stood, on what device and
// when, to anyone who downloads it.
//
//   node scripts/scrub-storage-photos.mjs            list what would change (local stack)
//   node scripts/scrub-storage-photos.mjs --write    rewrite the photos (local stack)
//
// Against the hosted project, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// in the environment and add --hosted:
//
//   node scripts/scrub-storage-photos.mjs --hosted            dry run
//   node scripts/scrub-storage-photos.mjs --hosted --write
//
// A photo that is already a JPEG with no metadata is left alone, so the
// script can be run again safely. A rewritten object's owner_id becomes
// null (the service role has no user); nothing reads the owner of a photo a
// report already points at. Purge the CDN cache afterwards: public URLs are
// served with a one-hour cache.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const BUCKETS = ['ReportImage', 'Avatars'];
// What sanitize-image.ts produces: at most this many pixels on the long
// side, at this quality.
const MAX_EDGE = 2560;
const JPEG_QUALITY = 85;
const PAGE = 100;

const write = process.argv.includes('--write');
const hosted = process.argv.includes('--hosted');

function connection() {
  if (hosted) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use --hosted.'
      );
    }
    return { url, key };
  }
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
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(env.API_URL ?? '')) {
    throw new Error(
      'The local stack is not running. Pass --hosted to use another project.'
    );
  }
  return { url: env.API_URL, key: env.SERVICE_ROLE_KEY };
}

const { url, key } = connection();
// Listing and overwriting other people's files needs the service role.
const client = createClient(url, key, { auth: { persistSession: false } });

/** Every file in a bucket, walking folders. Folders list with a null id. */
async function listFiles(bucket, folder = '') {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client.storage.from(bucket).list(folder, {
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const entry of data) {
      const path = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await listFiles(bucket, path)));
      else files.push(path);
    }
    if (data.length < PAGE) return files;
  }
}

/** Which kinds of metadata an image carries, e.g. ['exif', 'xmp']. */
function metadataKinds(meta) {
  return ['exif', 'icc', 'iptc', 'xmp'].filter((kind) => meta[kind]);
}

const counts = { clean: 0, rewritten: 0, wouldRewrite: 0, failed: 0 };

for (const bucket of BUCKETS) {
  const paths = await listFiles(bucket);
  console.log(`${bucket}: ${paths.length} file(s)`);
  for (const path of paths) {
    try {
      const { data: blob, error } = await client.storage
        .from(bucket)
        .download(path);
      if (error) throw error;
      const original = Buffer.from(await blob.arrayBuffer());
      const meta = await sharp(original).metadata();
      const kinds = metadataKinds(meta);
      if (meta.format === 'jpeg' && kinds.length === 0) {
        counts.clean += 1;
        continue;
      }
      const reason =
        meta.format === 'jpeg' ? kinds.join('+') : `${meta.format} file`;
      if (!write) {
        counts.wouldRewrite += 1;
        console.log(`  would rewrite ${path} (${reason})`);
        continue;
      }
      // rotate() bakes in the EXIF orientation before the tag is dropped;
      // sharp writes no metadata unless asked to.
      const clean = await sharp(original)
        .rotate()
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      const { error: uploadError } = await client.storage
        .from(bucket)
        .upload(path, clean, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });
      if (uploadError) throw uploadError;
      counts.rewritten += 1;
      console.log(`  rewrote ${path} (${reason})`);
    } catch (error) {
      counts.failed += 1;
      console.log(`  FAILED ${path}: ${error.message ?? error}`);
    }
  }
}

console.log(
  write
    ? `\n${counts.rewritten} rewritten, ${counts.clean} already clean, ${counts.failed} failed.`
    : `\n${counts.wouldRewrite} would be rewritten, ${counts.clean} already clean, ${counts.failed} could not be read. Run again with --write to rewrite them.`
);
if (counts.failed > 0) process.exit(1);
