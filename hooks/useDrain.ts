import { useEffect, useState } from 'react';
import type {
  FeatureCollection,
  Feature,
  GeoJsonProperties,
  Point,
} from 'geojson';

import type { Drain } from '@/components/control-panel/types';

export function transformGeoJSON(geojson: FeatureCollection): Drain[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      In_Name: string;
      InvElev: number;
      clog_per: number;
      clogtime: number;
      Weir_coeff: number;
      Length: number;
      Height: number;
      Max_Depth: number;
      ClogFac: number;
      NameNum: number;
      FPLAIN_080: number;
    };

    const coords =
      f.geometry && f.geometry.type === 'Point'
        ? (f.geometry as Point).coordinates
        : [0, 0];

    return {
      id: props.In_Name,
      In_Name: props.In_Name,
      InvElev: props.InvElev,
      clog_per: props.clog_per,
      clogtime: props.clogtime,
      Weir_coeff: props.Weir_coeff,
      Length: props.Length,
      Height: props.Height,
      Max_Depth: props.Max_Depth,
      ClogFac: props.ClogFac,
      NameNum: props.NameNum,
      FPLAIN_080: props.FPLAIN_080,
      coordinates: coords as [number, number],
    };
  });
}

export function useDrain() {
  const [drains, setDrains] = useState<Drain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/drainage/storm_drains.geojson');
        const geojson = await res.json();
        const data = transformGeoJSON(geojson);
        setDrains(data);
      } catch (err) {
        console.error('Failed to load storm_drains.geojson', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { drains, loading };
}
