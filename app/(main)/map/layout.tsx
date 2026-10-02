import type { Metadata } from 'next';

// The page is a client component, so its title lives in this layout.
export const metadata: Metadata = {
  title: 'Map',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
