import type { Metadata } from 'next';

// The page is a client component, so its title lives in this layout.
export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
