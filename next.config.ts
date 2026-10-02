import type { NextConfig } from 'next';

// next/image fetches only from our own storage: the Supabase project's public
// buckets (report photos, avatars). It used to accept any https host, which
// let anyone use /_next/image to fetch and resize images from anywhere.
// NEXT_PUBLIC_SUPABASE_URL is the hosted project in production and the local
// stack (http://127.0.0.1:54321) in development.
const supabase = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
);
const localSupabase = ['127.0.0.1', 'localhost'].includes(supabase.hostname);

const isProd = process.env.NODE_ENV === 'production';

/** The origin of a URL from the environment, or null if unset or invalid. */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Every origin the browser talks to, gathered from the code (2026-09-30):
// - Supabase (NEXT_PUBLIC_SUPABASE_URL): REST, auth and storage over https,
//   realtime over wss; report photos and avatars as images.
// - The simulation server (NEXT_PUBLIC_BACKEND_URL): fetch only.
// - Mapbox GL: styles, tiles, sprites and glyphs from api.mapbox.com and
//   *.tiles.mapbox.com, telemetry to events.mapbox.com. It runs its workers
//   from blob: URLs and draws images from blob:/data:. The standard v3 build
//   needs no 'unsafe-eval' (Mapbox's "CSP directives" guide).
// - The 3D model viewer: drei's <Environment preset> fetches its HDR from
//   raw.githack.com. The .glb models are ours and use no Draco, so gstatic's
//   decoder is never fetched.
// - The docs page embeds one YouTube video.
// - Fonts are self-hosted by next/font. Gemini is called from the server only.
// Vercel's preview toolbar (vercel.live) is allowed on preview builds only.
const supabaseOrigin = supabase.origin;
const supabaseRealtime = supabaseOrigin.replace(/^http/, 'ws');
const backendOrigin = originOf(process.env.NEXT_PUBLIC_BACKEND_URL);
const vercelPreview = process.env.VERCEL_ENV === 'preview';
const vercelLive = vercelPreview ? ['https://vercel.live'] : [];
// What the toolbar needs beyond vercel.live (Vercel's toolbar CSP guide).
const vercelToolbarImg = vercelPreview ? ['https://vercel.com'] : [];
const vercelToolbarFont = vercelPreview ? ['https://assets.vercel.com'] : [];

const mapbox = [
  'https://api.mapbox.com',
  'https://*.tiles.mapbox.com',
  'https://events.mapbox.com',
];

const csp: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Next.js streams its page data in inline <script> tags, and next-themes
  // adds one to set the theme before paint. Nonces would allow those without
  // 'unsafe-inline', but a nonce has to be minted per request in proxy.ts,
  // which turns every static page dynamic. With no nonce in use,
  // 'unsafe-inline' is the price; the other directives still stop loading
  // script from anywhere else. 'unsafe-eval' is for React's dev tooling and
  // is never sent in production.
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    ...(isProd ? [] : ["'unsafe-eval'"]),
    ...vercelLive,
  ],
  // Inline style attributes everywhere (React, Mapbox popups, charts).
  'style-src': ["'self'", "'unsafe-inline'", ...vercelLive],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    supabaseOrigin,
    ...mapbox,
    ...vercelLive,
    ...vercelToolbarImg,
  ],
  'font-src': ["'self'", 'data:', ...vercelLive, ...vercelToolbarFont],
  'connect-src': [
    "'self'",
    supabaseOrigin,
    supabaseRealtime,
    ...(backendOrigin ? [backendOrigin] : []),
    ...mapbox,
    'https://raw.githack.com',
    // Dev server hot reload.
    ...(isProd ? [] : ['ws:']),
    ...vercelLive,
    ...(vercelPreview ? ['wss://ws-us3.pusher.com'] : []),
  ],
  'worker-src': ["'self'", 'blob:'],
  'child-src': ["'self'", 'blob:'],
  'frame-src': [
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    ...vercelLive,
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  // Not locally: the dev server and the local Supabase stack are plain http.
  ...(isProd && !localSupabase ? { 'upgrade-insecure-requests': [] } : {}),
};

const contentSecurityPolicy = Object.entries(csp)
  .map(([name, values]) => [name, ...values].join(' '))
  .join('; ');

// Report-only until the map pages have been checked against a real Mapbox
// token (none is available locally). Flip to true once a preview deployment
// shows no "Content-Security-Policy" violations in the browser console on
// /map, /simulation, /dashboard and /docs.
const ENFORCE_CSP = false;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: supabase.protocol === 'http:' ? 'http' : 'https',
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // The image optimiser refuses private addresses unless told otherwise;
    // only the local stack needs it.
    dangerouslyAllowLocalIP: localSupabase,
  },
  // Baseline headers on every response. Not framed by other sites
  // (clickjacking); files served as their declared type; no full URL sent to
  // other sites; no camera or microphone. Geolocation stays on for this
  // origin: the report form uses the phone's location. The content security
  // policy is described above; HSTS only in production (localhost is http).
  async headers() {
    return [
      {
        // The flood overlays are versioned exports (see
        // scripts/slim-flood-hazard.mjs): a change ships under a new name,
        // so browsers may keep these forever instead of revalidating 2-4 MB
        // downloads on every map visit.
        source: '/flood-hazard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: ENFORCE_CSP
              ? 'Content-Security-Policy'
              : 'Content-Security-Policy-Report-Only',
            value: contentSecurityPolicy,
          },
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  webpack(config) {
    // Handle SVG imports with SVGR
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
};

export default nextConfig;
