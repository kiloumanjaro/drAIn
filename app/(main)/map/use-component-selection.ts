import { useCallback, useState, type RefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type {
  DatasetType,
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';
import { useLatestRef } from '@/hooks/use-latest-ref';
import { CAMERA_ANIMATION } from '@/lib/map/config';
import {
  NO_SELECTION,
  componentCenter,
  selectionOf,
  type ComponentRef,
  type SelectedComponents,
} from '@/lib/map/component-selection';
import {
  focusMapFeature as focusFeatureOnMap,
  type SelectedFeature,
} from '@/lib/map/focus-feature';

/**
 * Which drainage component is selected: the one the control panel details,
 * and the feature highlighted on the map.
 *
 * Every function returned is stable. The map's click handler is registered
 * once and keeps the copies from that render, so they must not close over
 * state; the highlighted feature is read through a ref for that reason.
 */
export function useComponentSelection(mapRef: RefObject<mapboxgl.Map | null>) {
  const [selected, setSelected] = useState<SelectedComponents>(NO_SELECTION);
  const [dataset, setDataset] = useState<DatasetType>('inlets');
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
  const selectedFeatureRef = useLatestRef(selectedFeature);

  const clearSelections = useCallback(() => {
    setSelected(NO_SELECTION);

    // Also clear the map's feature state if something was selected
    if (selectedFeatureRef.current && mapRef.current) {
      mapRef.current.setFeatureState(
        {
          source: selectedFeatureRef.current.source,
          id: selectedFeatureRef.current.id,
        },
        { selected: false }
      );
      setSelectedFeature(null);
    }
  }, [selectedFeatureRef, mapRef]);

  /**
   * Select a component: detail it in the panel, switch the panel's table to
   * its dataset, highlight it and fly to it. The tab is chosen by the
   * caller, not here.
   */
  const selectComponent = useCallback(
    (component: ComponentRef) => {
      const map = mapRef.current;
      if (!map) return;
      const center = componentCenter(component);
      if (center === null) return;

      clearSelections();

      setSelected(selectionOf(component));
      setDataset(component.type);
      setSelectedFeature(
        focusFeatureOnMap(
          map,
          component.type,
          component.item.id,
          center,
          CAMERA_ANIMATION
        )
      );
    },
    [clearSelections, mapRef]
  );

  /**
   * Detail a component in the panel without touching the map: no highlight,
   * no camera move, and the previous highlight stays. What a report bubble's
   * history button does.
   */
  const showComponent = useCallback((component: ComponentRef) => {
    setSelected(selectionOf(component));
  }, []);

  const handleSelectInlet = useCallback(
    (item: Inlet) => selectComponent({ type: 'inlets', item }),
    [selectComponent]
  );
  const handleSelectOutlet = useCallback(
    (item: Outlet) => selectComponent({ type: 'outlets', item }),
    [selectComponent]
  );
  const handleSelectDrain = useCallback(
    (item: Drain) => selectComponent({ type: 'storm_drains', item }),
    [selectComponent]
  );
  const handleSelectPipe = useCallback(
    (item: Pipe) => selectComponent({ type: 'man_pipes', item }),
    [selectComponent]
  );

  return {
    selected,
    dataset,
    setDataset,
    clearSelections,
    selectComponent,
    showComponent,
    handleSelectInlet,
    handleSelectOutlet,
    handleSelectDrain,
    handleSelectPipe,
  };
}
