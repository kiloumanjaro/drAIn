'use client';

import dynamic from 'next/dynamic';
import MapLoading from './loading';

// Mapbox GL is about 1.6 MB of script that only runs in a browser. Loading
// the page body on demand keeps it out of the script the HTML waits for, so
// the shell and this spinner paint first. `ssr: false` also means the body's
// useSearchParams never runs during prerender, so the route stays static.
const MapClient = dynamic(() => import('./map-client'), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function MapPage() {
  return <MapClient />;
}
