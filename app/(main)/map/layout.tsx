import type { Metadata } from 'next';
// Mapbox's stylesheet is imported here, not in the lazily loaded page body:
// from a layout it is in the document from the start and after globals.css,
// the order it had when the page imported it. globals.css restyles the
// popups with !important and two-class selectors, which win either way.
import 'mapbox-gl/dist/mapbox-gl.css';

// The page is a client component, so its title lives in this layout.
export const metadata: Metadata = {
  title: 'Map',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
