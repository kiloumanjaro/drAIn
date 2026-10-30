import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMarkdown from './chat-markdown';

const render = (content: string) =>
  renderToStaticMarkup(<ChatMarkdown content={content} />);

describe('ChatMarkdown', () => {
  it('turns list and bold marks into elements', () => {
    const html = render(
      'Check these:\n\n*   **Inlets** first\n*   then _pipes_'
    );
    expect(html).toContain('<ul');
    expect(html).toMatch(/<li[^>]*><strong[^>]*>Inlets<\/strong> first<\/li>/);
    expect(html).toMatch(/<em[^>]*>pipes<\/em>/);
    expect(html).not.toContain('*');
  });

  it('opens links in a new tab without handing over the opener', () => {
    const html = render('See [the docs](https://example.com/docs).');
    expect(html).toMatch(
      /<a href="https:\/\/example\.com\/docs" target="_blank" rel="noopener noreferrer"/
    );
  });

  it('drops a link target that would run script', () => {
    const html = render('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('shows raw HTML as text instead of rendering it', () => {
    const html = render('Hi <img src=x onerror=alert(1)> <script>x()</script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
  });

  it('shows the description of an image rather than loading it', () => {
    const html = render('![a flooded street](https://example.com/a.png)');
    expect(html).toContain('a flooded street');
    expect(html).not.toContain('<img');
  });

  it('keeps headings out of the page outline', () => {
    expect(render('## Summary')).not.toMatch(/<h\d/);
  });
});
