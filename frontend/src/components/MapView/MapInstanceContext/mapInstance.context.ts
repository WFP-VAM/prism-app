import { createContext } from 'react';
import { LayerType } from 'config/types';
import { DateRange } from 'context/mapStateSlice';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { RootState } from 'context/store';
import { Map as MaplibreMap } from 'maplibre-gl';

type MapGetter = () => MaplibreMap | undefined;

interface SetOpacityParams {
  map: MaplibreMap | undefined;
  layerId: LayerType['id'] | undefined;
  layerType: LayerType['type'] | 'analysis' | undefined;
  value: number;
  callback?: (v: number) => void;
}

export type MapInstanceActions = {
  addLayer: (layer: LayerType) => void;
  removeLayer: (layer: LayerType) => void;
  updateDateRange: (dateRange: DateRange) => void;
  setMap: (mapGetter: MapGetter) => void;
  removeLayerData: (layer: LayerType) => void;
  setBoundaryRelationData: (data: BoundaryRelationsDict) => void;
  dismissError: (error: string) => void;
  setOpacity: (params: SetOpacityParams) => void;
  updateMapTitle: (title: string) => void;
};

export type MapInstanceSelectors = {
  selectLayers: (state: RootState) => LayerType[];
  selectDateRange: (state: RootState) => DateRange;
  selectMap: (state: RootState) => MapGetter;
  selectOpacity: (layerId: string) => (state: RootState) => number | undefined;
  selectMinMapBounds: (state: RootState) => number[] | undefined;
  selectCapturedViewport: (
    state: RootState,
  ) => [number, number, number, number] | undefined;
  selectMapTitle: (state: RootState) => string | undefined;
};

type MapInstanceContextType = {
  elementId: string;
  selectors: Partial<MapInstanceSelectors>;
  actions: MapInstanceActions;
};

const MapInstanceContext = createContext<MapInstanceContextType | null>(null);

export default MapInstanceContext;
