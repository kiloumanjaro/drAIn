import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeploymentSection } from './deployment';

const before = process.env.NEXT_PUBLIC_SITE_URL;
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://drain.example.test';
});
afterEach(() => {
  if (before === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = before;
});

describe('DeploymentSection', () => {
  it('shows the live demo link from siteUrl() and no test login', () => {
    const html = renderToStaticMarkup(<DeploymentSection />);
    expect(html).toContain('https://drain.example.test/');
    expect(html).not.toContain('ai-drain.vercel.app');
    expect(html).not.toContain('tester@gmail.com');
  });

  it('names Render, not Railway, as the backend host', () => {
    const html = renderToStaticMarkup(<DeploymentSection />);
    expect(html).toContain('Render');
    expect(html).not.toContain('Railway');
  });
});
