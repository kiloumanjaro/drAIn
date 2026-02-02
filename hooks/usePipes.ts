import { useEffect, useState } from 'react';
import type {
  FeatureCollection,
  Feature,
  GeoJsonProperties,
  LineString,
} from 'geojson';

import type { Pipe } from '@/components/control-panel/types';

export function transformGeoJSON(geojson: FeatureCollection): Pipe[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      Name: string;
      TYPE: string;
      Pipe_Shape: string;
      Pipe_Lngth: number;
      Height: number;
      Width: number;
      Barrels: number;
      ClogPer: number;
      ClogTime: number;
      Mannings: number;
    };

    const coords =
      f.geometry && f.geometry.type === 'LineString'
        ? (f.geometry as LineString).coordinates
        : [];

    return {
      id: props.Name,
      TYPE: props.TYPE,
      Pipe_Shape: props.Pipe_Shape,
      Pipe_Lngth: props.Pipe_Lngth,
      Height: props.Height,
      Width: props.Width,
      Barrels: props.Barrels,
      ClogPer: props.ClogPer,
      ClogTime: props.ClogTime,
      Mannings: props.Mannings,
      coordinates: coords as [number, number][],
    };
  });
}

export function usePipes() {
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/drainage/man_pipes.geojson');
        const geojson = await res.json();
        const data = transformGeoJSON(geojson);
        setPipes(data);
      } catch (err) {
        console.error('Failed to load man_pipes.geojson', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { pipes, loading };
}
