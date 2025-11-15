import { useContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Map as MaplibreMap } from 'maplibre-gl';
import { LayerType } from 'config/types';
import MapInstanceContext from 'components/MapView/MapInstanceContext/mapInstance.context';
import {
  opacitySelector,
  setOpacity as setGlobalOpacity,
} from 'context/opacityStateSlice';

import { useMapState } from './useMapState';

interface SetOpacityParams {
  map: MaplibreMap | undefined;
  layerId: LayerType['id'] | undefined;
  layerType: LayerType['type'] | 'analysis' | undefined;
  value: number;
  callback?: (v: number) => void;
}

export interface UnifiedOpacityState {
  getOpacitySelector: (layerId: string) => (state: any) => number | undefined;
  setOpacity: (params: SetOpacityParams) => void;
  isGlobalMap: boolean;
}

export function useOpacityState(): UnifiedOpacityState {
  const { isGlobalMap } = useMapState();
  const mapInstanceContext = useContext(MapInstanceContext);
  const dispatch = useDispatch();

  const getOpacitySelector = useCallback(
    (layerId: string) => {
      if (!isGlobalMap && mapInstanceContext?.selectors?.selectOpacity) {
        const selector = mapInstanceContext.selectors.selectOpacity(layerId);

        return selector;
      }

      return opacitySelector(layerId);
    },
    [mapInstanceContext, isGlobalMap],
  );

  const setOpacity = useCallback(
    (params: SetOpacityParams) => {
      if (!isGlobalMap && mapInstanceContext?.actions?.setOpacity) {
        mapInstanceContext.actions.setOpacity(params);
      } else {
        dispatch(setGlobalOpacity(params));
      }
    },
    [mapInstanceContext, dispatch, isGlobalMap],
  );

  return {
    getOpacitySelector,
    setOpacity,
    isGlobalMap: !mapInstanceContext,
  };
}
