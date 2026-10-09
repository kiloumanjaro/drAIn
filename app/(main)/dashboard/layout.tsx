import type { Metadata } from 'next';
// Mapbox's stylesheet, for the lazily loaded zone map; see map/layout.tsx.
import 'mapbox-gl/dist/mapbox-gl.css';

// The page is a client component, so its title lives in this layout.
export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
