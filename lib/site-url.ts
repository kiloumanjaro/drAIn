/**
 * The site's public origin, for absolute URLs in metadata, the sitemap and
 * robots.txt. NEXT_PUBLIC_SITE_URL wins (set it once a custom domain is
 * connected); on Vercel the production domain is the fallback, and locally
 * the dev server.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

/** The pages worth indexing: everything a signed-out visitor can open. */
export const PUBLIC_PATHS = [
  '/',
  '/map',
  '/simulation',
  '/dashboard',
  '/docs',
] as const;
