import ReactMarkdown, { type Components } from 'react-markdown';

// The assistant answers in Markdown. Sized for a chat bubble: tight spacing,
// headings no bigger than the text. Raw HTML in a reply is shown as text,
// not rendered (react-markdown's default).
const components: Components = {
  // pre-line keeps a single line break inside a paragraph, as the plain
  // text bubble did.
  p: ({ node: _node, ...props }) => (
    <p className="mb-2 whitespace-pre-line last:mb-0" {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="pl-0.5" {...props} />,
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold" {...props} />
  ),
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs"
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="mb-2 overflow-x-auto rounded bg-gray-100 p-2 last:mb-0 [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  a: ({ node: _node, children, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="[overflow-wrap:anywhere] text-blue-700 underline hover:text-blue-900"
    >
      {children}
    </a>
  ),
  h1: ({ node: _node, ...props }) => <Heading {...props} />,
  h2: ({ node: _node, ...props }) => <Heading {...props} />,
  h3: ({ node: _node, ...props }) => <Heading {...props} />,
  h4: ({ node: _node, ...props }) => <Heading {...props} />,
  h5: ({ node: _node, ...props }) => <Heading {...props} />,
  h6: ({ node: _node, ...props }) => <Heading {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="mb-2 border-l-2 border-gray-300 pl-3 last:mb-0"
      {...props}
    />
  ),
  hr: () => <hr className="my-2 border-gray-200" />,
  // A reply cannot pull in a picture from elsewhere; show its description.
  img: ({ alt }) => <>{alt}</>,
};

// Not a real heading: a chat reply should not add to the page's outline.
function Heading({ children }: { children?: React.ReactNode }) {
  return <p className="mb-1 font-semibold">{children}</p>;
}

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
