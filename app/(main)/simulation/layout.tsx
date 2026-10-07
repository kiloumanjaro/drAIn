import type { Metadata } from 'next';
// Mapbox's stylesheet, for the lazily loaded page body; see map/layout.tsx.
import 'mapbox-gl/dist/mapbox-gl.css';

// The page is a client component, so its title lives in this layout.
export const metadata: Metadata = {
  title: 'Simulation',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
