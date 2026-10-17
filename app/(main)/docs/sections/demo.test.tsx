import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DemoSection } from './demo';

describe('DemoSection', () => {
  it('embeds the demo video from the no-cookie YouTube domain', () => {
    const html = renderToStaticMarkup(<DemoSection />);
    expect(html).toContain(
      'src="https://www.youtube-nocookie.com/embed/ZHE9dCcayRQ"'
    );
    expect(html).not.toContain('www.youtube.com');
  });
});
