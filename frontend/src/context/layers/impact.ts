import { FeatureCollection } from 'geojson';
import {
  AggregationOperations,
  ImpactLayerProps,
  AdminLevelDataLayerProps,
  WMSLayerProps,
} from 'config/types';
import type { ThunkApi } from 'context/store';

import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { boundaryCache } from 'utils/boundary-cache';
import type { BaselineLayerData } from 'utils/analysis-utils';
import {
  checkBaselineDataLayer,
  loadFeaturesFromApi,
} from 'utils/analysis-utils';
import type { LayerDataParams, LazyLoader } from './layer-data';

export type ImpactLayerData = {
  boundaries: FeatureCollection;
  impactFeatures: FeatureCollection;
};

export const fetchImpactLayerData: LazyLoader<ImpactLayerProps> =
  loadLayerData =>
  async (params: LayerDataParams<ImpactLayerProps>, api: ThunkApi) => {
    const { getState, dispatch } = api;
    const { layer, extent, date } = params;

    const operation = layer.operation || AggregationOperations.Mean;

    const hazardLayerDef = LayerDefinitions[layer.hazardLayer] as WMSLayerProps;

    const baselineLayer = layerDataSelector(layer.baselineLayer)(getState());

    // Use global boundary cache
    const boundaryLayer = getBoundaryLayerSingleton();
    const adminBoundaries = await boundaryCache.getBoundaryData(
      boundaryLayer,
      dispatch,
    );
    if (!adminBoundaries) {
      throw new Error('Boundary Layer not loaded!');
    }

    let baselineData: BaselineLayerData;
    if (!baselineLayer) {
      const baselineLayerDef = LayerDefinitions[layer.baselineLayer];
      const {
        payload: { data },
      } = (await dispatch(
        loadLayerData({
          layer: baselineLayerDef,
          extent,
        } as LayerDataParams<AdminLevelDataLayerProps>),
      )) as { payload: { data: unknown } };

      baselineData = checkBaselineDataLayer(layer.baselineLayer, data);
    } else {
      baselineData = checkBaselineDataLayer(
        layer.baselineLayer,
        baselineLayer.data,
      );
    }

    const activeFeatures = await loadFeaturesFromApi(
      layer,
      baselineData,
      hazardLayerDef,
      operation,
      dispatch,
      extent,
      date,
    );

    return {
      boundaries: adminBoundaries,
      impactFeatures: {
        ...adminBoundaries,
        features: activeFeatures,
      },
    };
  };
