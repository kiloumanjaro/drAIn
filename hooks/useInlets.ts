import { useEffect, useState } from 'react';
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';

import { Inlet } from '@/components/control-panel/types';

export function transformInlets(geojson: FeatureCollection): Inlet[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      In_Name: string;
      Inv_Elev: number;
      MaxDepth: number;
      Length: number;
      Height: number;
      Weir_Coeff: number;
      In_Type: number;
      ClogFac: number;
      ClogTime: number;
      FPLAIN_080: number;
    };

    return {
      id: props.In_Name,
      Inv_Elev: props.Inv_Elev,
      MaxDepth: props.MaxDepth,
      Length: props.Length,
      Height: props.Height,
      Weir_Coeff: props.Weir_Coeff,
      In_Type: props.In_Type,
      ClogFac: props.ClogFac,
      ClogTime: props.ClogTime,
      FPLAIN_080: props.FPLAIN_080,
      coordinates:
        f.geometry?.type === 'Point'
          ? (f.geometry.coordinates as [number, number])
          : [0, 0],
    };
  });
}

export function useInlets() {
  const [inlets, setInlets] = useState<Inlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/drainage/inlets.geojson');
        const geojson = await res.json();
        const data = transformInlets(geojson);
        setInlets(data);
      } catch (err) {
        console.error('Failed to load inlets.geojson', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { inlets, loading };
}
