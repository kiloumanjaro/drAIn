import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

// Every crawler, AI ones included, may read the pages; the API routes are
// not pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
