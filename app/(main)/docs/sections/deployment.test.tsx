import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeploymentSection } from './deployment';

describe('DeploymentSection', () => {
  it('shows the live demo link and no test login', () => {
    const html = renderToStaticMarkup(<DeploymentSection />);
    expect(html).toContain('https://ai-drain.vercel.app/');
    expect(html).not.toContain('tester@gmail.com');
  });
});
