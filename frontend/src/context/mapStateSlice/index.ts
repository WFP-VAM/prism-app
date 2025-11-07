import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LayerKey, LayerType } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import {
  LayerData,
  LayerDataTypes,
  loadLayerData,
} from 'context/layers/layer-data';
import { BoundaryRelationsDict } from 'components/Common/BoundaryDropdown/utils';
import { keepLayer } from 'utils/keep-layer-utils';
import { Map as MaplibreMap } from 'maplibre-gl';

export interface DateRange {
  startDate?: number;
  // TODO this field is updated, but doesn't seem to be used yet
  endDate?: number;
}

export type MapState = {
  layers: LayerType[];
  dateRange: DateRange;
  maplibreMap: MapGetter;
  minMapBounds: number[];
  errors: string[];
  // TODO this shouldn't be any
  // Note: Boundary layer data is now stored in global cache (utils/boundary-cache.ts), not here
  layersData: LayerData<any>[];
  // Keep track of layer id which are currently loading its layerData.
  // Note that layerData is mainly for storing vector map data.
  // Tile image loading for raster layer is tracked separately on mapTileLoadingStateSlice
  loadingLayerIds: LayerKey[];
  boundaryRelationData: BoundaryRelationsDict;
  title?: string;
};

// Maplibre's map type contains some kind of cyclic dependency that causes an infinite loop in immers's change
// tracking. To save it off, we wrap it in a JS closure so that Redux just checks the function for changes, rather
// than recursively walking the whole object.
type MapGetter = () => MaplibreMap | undefined;

const initialState: MapState = {
  layers: [],
  dateRange: {} as DateRange,
  maplibreMap: (() => {}) as MapGetter,
  minMapBounds: [] as number[],
  errors: [],
  layersData: [],
  loadingLayerIds: [],
  boundaryRelationData: {},
};

const getTypeOrder = (layer: LayerType) => {
  if (layer.type === 'admin_level_data' && layer.fillPattern) {
    return 'pattern_admin_level_data';
  }
  if (layer.type === 'wms' && layer.geometry) {
    return 'polygon';
  }
  return layer.type;
};

// TODO: update ordering?
// Order layers to keep boundaries and point_data on top. boundaries first.
export const layerOrdering = (a: LayerType, b: LayerType) => {
  // Dictionary with all the available layerTypes
  // Note: polygon is layer.type === 'wms' && layer.geometry
  const order: {
    [key in
      | 'boundary'
      | 'composite'
      | 'wms'
      | 'admin_level_data'
      | 'pattern_admin_level_data'
      | 'impact'
      | 'point_data'
      | 'geojson_polygon'
      | 'polygon'
      | 'static_raster'
      | 'anticipatory_action_drought'
      | 'anticipatory_action_storm'
      | 'anticipatory_action_flood']: number;
  } = {
    point_data: 0,
    geojson_polygon: 1,
    polygon: 2,
    boundary: 3,
    pattern_admin_level_data: 4,
    admin_level_data: 5,
    impact: 6,
    composite: 6,
    wms: 7,
    static_raster: 8,
    anticipatory_action_drought: 9,
    anticipatory_action_storm: 10,
    anticipatory_action_flood: 11,
  };

  const typeA = getTypeOrder(a);
  const typeB = getTypeOrder(b);

  return order[typeA] - order[typeB];
};

export const mapStateSlice = createSlice({
  name: 'mapState',
  initialState,
  reducers: {
    addLayer: ({ layers, ...rest }, { payload }: PayloadAction<LayerType>) => {
      const layersToAdd = payload?.group?.activateAll
        ? Object.values(LayerDefinitions).filter(l =>
            payload?.group?.layers?.map(layer => layer.id).includes(l.id),
          )
        : [payload];

      // TODO: something is wrong with the types imported by 'maplibre-gl' in config/types.ts
      //  @ts-ignore
      const filteredLayers = layers.filter(layer => keepLayer(layer, payload));

      // Keep boundary layers at the top of our stack and remove duplicates
      const newLayers =
        payload.type === 'boundary'
          ? [...layersToAdd, ...filteredLayers]
          : [...filteredLayers, ...layersToAdd];

      // Deduplicate layers
      const dedupedLayers = newLayers.filter(
        (layer, index, self) =>
          index ===
          self.findIndex(t => t.id === layer.id && t.type === layer.type),
      );

      return {
        ...rest,
        layers: dedupedLayers,
      };
    },
    removeLayerData: (
      { layersData, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layersData: layersData.filter(({ layer }) => layer.id !== payload.id),
    }),

    removeLayer: (
      { layers, ...rest },
      { payload }: PayloadAction<LayerType>,
    ) => ({
      ...rest,
      layers: layers.filter(({ id }) =>
        // Keep layers without group and layers with group from different group.
        payload.group
          ? !payload.group.layers.map(l => l.id).includes(id)
          : id !== payload.id,
      ),
    }),

    updateDateRange: (state, { payload }: PayloadAction<DateRange>) => ({
      ...state,
      dateRange: payload,
    }),

    setMap: (state, { payload }: PayloadAction<MapGetter>) => ({
      ...state,
      maplibreMap: payload,
    }),

    setBoundaryRelationData: (
      state,
      { payload }: PayloadAction<BoundaryRelationsDict>,
    ) => ({
      ...state,
      boundaryRelationData: payload,
    }),

    dismissError: (
      { errors, ...rest },
      { payload }: PayloadAction<string>,
    ) => ({
      ...rest,
      errors: errors.filter(msg => msg !== payload),
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadLayerData.fulfilled,
      (
        { layersData, loadingLayerIds, ...rest },
        { payload }: PayloadAction<LayerDataTypes>,
      ) => ({
        ...rest,
        loadingLayerIds: loadingLayerIds.filter(id => id !== payload.layer.id),
        layersData: layersData.concat(payload),
      }),
    );

    builder.addCase(
      loadLayerData.rejected,
      ({ loadingLayerIds, errors, ...rest }, action) => ({
        ...rest,
        loadingLayerIds: loadingLayerIds.filter(
          id => id !== action.meta.arg.layer.id,
        ),
        errors: errors.concat(
          action.error.message ? action.error.message : action.error.toString(),
        ),
      }),
    );

    builder.addCase(
      loadLayerData.pending,
      ({ loadingLayerIds, ...rest }, action) => ({
        ...rest,
        loadingLayerIds: loadingLayerIds.concat([action.meta.arg.layer.id]),
      }),
    );
  },
});

// Setters
export const {
  addLayer,
  removeLayer,
  updateDateRange,
  setMap,
  removeLayerData,
  setBoundaryRelationData,
} = mapStateSlice.actions;

export default mapStateSlice.reducer;
