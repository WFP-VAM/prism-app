import { get, has, isNull, isString } from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import bbox from '@turf/bbox';

import { FeatureCollection } from 'geojson';
import { LayerData, LayerDataParams, loadLayerData } from './layer-data';
import {
  AggregationOperations,
  BoundaryLayerProps,
  ImpactLayerProps,
  NSOLayerProps,
  StatsApi,
  ThresholdDefinition,
  WMSLayerProps,
} from '../../config/types';
import type { ThunkApi } from '../store';

import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../config/utils';
import {
  Extent,
  featureIntersectsImage,
  GeoJsonBoundary,
  pixelsInFeature,
} from '../../components/MapView/Layers/raster-utils';
import type { NSOLayerData } from './nso';
import { getWCSLayerUrl, WMSLayerData } from './wms';
import { BoundaryLayerData } from './boundary';
import type {
  LayerData,
  LayerDataParams,
  LazyLoader,
  LoadLayerDataFuncType,
} from './layer-data';
import { layerDataSelector } from '../mapStateSlice/selectors';
  BaselineLayerData,
  checkBaselineDataLayer,
  loadFeaturesClientSide,
  loadFeaturesFromApi,
} from '../../utils/analysis-utils';

export type ImpactLayerData = {
  boundaries: FeatureCollection;
  impactFeatures: FeatureCollection;
};

export const fetchImpactLayerData: LazyLoader<ImpactLayerProps> = loadLayerData => async (
  params: LayerDataParams<ImpactLayerProps>,
  api: ThunkApi,
) => {
  const { getState, dispatch } = api;
  const { layer, extent, date } = params;

  const operation = layer.operation || AggregationOperations.Mean;

  const hazardLayerDef = LayerDefinitions[layer.hazardLayer] as WMSLayerProps;

  const baselineLayer = layerDataSelector(layer.baselineLayer)(getState());

  const adminBoundariesLayer = layerDataSelector(
    getBoundaryLayerSingleton().id,
  )(getState()) as LayerData<BoundaryLayerProps> | undefined;
  if (!adminBoundariesLayer || !adminBoundariesLayer.data) {
    // TODO we are assuming here it's already loaded. In the future if layers can be preloaded like boundary this will break.
    throw new Error('Boundary Layer not loaded!');
  }
  const adminBoundaries = adminBoundariesLayer.data;

  let baselineData: BaselineLayerData;
  if (!baselineLayer) {
    const baselineLayerDef = LayerDefinitions[layer.baselineLayer];
    const {
      payload: { data },
    } = (await dispatch(
      loadLayerData({ layer: baselineLayerDef, extent } as LayerDataParams<
        NSOLayerProps
      >),
    )) as { payload: { data: unknown } };

    // eslint-disable-next-line fp/no-mutation
    baselineData = checkBaselineDataLayer(layer.baselineLayer, data);
  } else {
    // eslint-disable-next-line fp/no-mutation
    baselineData = checkBaselineDataLayer(
      layer.baselineLayer,
      baselineLayer.data,
    );
  }

  const activeFeatures = layer.api
    ? await loadFeaturesFromApi(
        layer,
        baselineData,
        hazardLayerDef,
        operation,
        extent,
        date,
      )
    : await loadFeaturesClientSide(
        api,
        layer,
        adminBoundaries,
        baselineData,
        hazardLayerDef,
        operation,
        loadLayerData,
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
