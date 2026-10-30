import type { Metadata } from 'next';

// The page is a client component, so its title lives in this layout.
export const metadata: Metadata = {
  title: 'Documentation',
  alternates: { canonical: '/docs' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  // The page has no visible heading; this names it for screen readers
  // and crawlers.
  return (
    <>
      <h1 className="sr-only">Documentation</h1>
      {children}
    </>
  );
}
