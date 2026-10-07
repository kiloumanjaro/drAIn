'use client';

import dynamic from 'next/dynamic';
import SimulationLoading from './loading';

// Same reason as the map page: Mapbox GL only runs in a browser, so the page
// body loads after the shell and this spinner have painted. `ssr: false`
// keeps the body's useSearchParams out of prerender, so the route stays
// static.
const SimulationClient = dynamic(() => import('./simulation-client'), {
  ssr: false,
  loading: () => <SimulationLoading />,
});

export default function SimulationPage() {
  return <SimulationClient />;
}
