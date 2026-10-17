import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

/** The value of one header on every page (the `/:path*` entry). */
async function pageHeader(key: string): Promise<string | undefined> {
  const entries = await nextConfig.headers!();
  const page = entries.find((entry) => entry.source === '/:path*');
  return page?.headers.find((header) => header.key === key)?.value;
}

describe('response headers', () => {
  it('allows no camera, microphone or location', async () => {
    expect(await pageHeader('Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=()'
    );
  });

  it('frames the demo video from youtube-nocookie only', async () => {
    const csp = await pageHeader('Content-Security-Policy');
    const frameSrc = csp
      ?.split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('frame-src '));
    expect(frameSrc).toContain('https://www.youtube-nocookie.com');
    expect(frameSrc).not.toContain('https://www.youtube.com');
  });
});
