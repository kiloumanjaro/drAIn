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

const nextConfig: NextConfig = {
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
  // origin: the report form uses the phone's location. A content security
  // policy would need care around Mapbox and Supabase and is left for later.
  async headers() {
    return [
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
