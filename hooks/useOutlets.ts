import { useEffect, useState } from 'react';
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';

import type { Outlet } from '@/components/control-panel/types';

export function transformOutletGeoJSON(geojson: FeatureCollection): Outlet[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      Out_Name: string;
      Inv_Elev: number;
      AllowQ: number;
      FlapGate: number;
    };

    const coords =
      f.geometry?.type === 'Point' ? f.geometry.coordinates : [0, 0];

    return {
      id: props.Out_Name,
      Inv_Elev: props.Inv_Elev,
      AllowQ: props.AllowQ,
      FlapGate: props.FlapGate,
      coordinates: coords as [number, number],
    };
  });
}

export function useOutlets() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/drainage/outlets.geojson');
        const geojson = await res.json();
        const data = transformOutletGeoJSON(geojson);
        setOutlets(data);
      } catch (err) {
        console.error('Failed to load outlets.geojson', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { outlets, loading };
}
