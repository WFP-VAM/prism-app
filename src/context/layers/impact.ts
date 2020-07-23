import { get, has, isNull, isString } from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import bbox from '@turf/bbox';

import {
  AggregationOperations,
  BoundaryLayerProps,
  ImpactLayerProps,
  LayerType,
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
// FIXME
import { LayerData, LayerDataParams, loadLayerData } from './layer-data';
import { layerDataSelector } from '../mapStateSlice';

export type ImpactLayerData = {
  boundaries: FeatureCollection;
  impactFeatures: FeatureCollection;
};

/* eslint-disable camelcase */
type ApiData = {
  geotiff_url: string;
  zones_url: string;
  group_by?: string;
  geojson_out?: string;
};

const fetchApiData = async (url: string, apiData: ApiData) =>
  (
    await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // body data type must match "Content-Type" header
      body: JSON.stringify(apiData),
    })
  ).json();

type BaselineLayerData = NSOLayerData;
type BaselineRecord = BaselineLayerData['layerData'][0];
type RasterLayer = LayerData<WMSLayerProps>;

const hasKeys = (obj: any, keys: string[]): boolean =>
  !keys.find(key => !has(obj, key));

const checkRasterLayerData = (layerData: LayerData<LayerType>): RasterLayer => {
  const isRasterLayerData = (maybeData: any): maybeData is WMSLayerData =>
    hasKeys(maybeData, ['rasters', 'image', 'transform']);

  const { layer, data } = layerData;

  if (layer.type === 'wms' && isRasterLayerData(data)) {
    return layerData as RasterLayer;
  }
  throw new Error(
    `Data for layer '${layer.id}' does not appear to be valid raster data.`,
  );
};

const checkBaselineDataLayer = (
  layerId: string,
  data: any,
): BaselineLayerData => {
  const isBaselineData = (maybeData: any): maybeData is BaselineLayerData =>
    hasKeys(maybeData, ['features', 'layerData']);

  if (isBaselineData(data)) {
    return data;
  }
  throw new Error(
    `Data for layer '${layerId}' does not appear to be valid baseline data.`,
  );
};

const operations = {
  mean: (data: number[]) =>
    data.reduce((sum, value) => sum + value, 0) / data.length,
  median: (data: number[]) => {
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedValues = data.sort();
    // Odd cases we use the middle value
    if (sortedValues.length % 2 !== 0) {
      return sortedValues[Math.floor(sortedValues.length / 2)];
    }
    // Even cases we average the two middles
    const floor = sortedValues.length / 2 - 1;
    const ceil = sortedValues.length / 2;
    return (sortedValues[floor] + sortedValues[ceil]) / 2;
  },
};

const scaleValueIfDefined = (
  value: number,
  scale?: number,
  offset?: number,
) => {
  return scale !== undefined && offset !== undefined
    ? value * scale + offset
    : value;
};

function thresholdOrNaN(value: number, threshold?: ThresholdDefinition) {
  if (threshold === undefined) {
    return value;
  }

  const isAbove =
    threshold.above === undefined ? true : value >= threshold.above;
  const isBelow =
    threshold.below === undefined ? true : value <= threshold.below;
  return isAbove && isBelow ? value : NaN;
}

function getBaselineDataForFeature(
  feature: GeoJsonBoundary,
  baselineData: BaselineLayerData,
): BaselineRecord | undefined {
  const { NSO_CODE: nsoCode } = feature.properties!;
  return baselineData.layerData.find(
    ({ adminKey }) => nsoCode.indexOf(adminKey) === 0,
  );
}

function mergeFeaturesByProperty(
  baselineFeatures: Feature[],
  aggregateData: Array<object>,
  id: string,
  operation: string,
): Feature[] {
  return baselineFeatures.map(feature1 => {
    const aggregateProperties = aggregateData.find(
      item => get(item, id) === get(feature1, ['properties', id]) && item,
    );
    const properties = {
      ...get(feature1, 'properties'),
      ...aggregateProperties,
      impactValue: get(feature1, 'properties.data'),
      [operation]: get(aggregateProperties, `stats_${operation}`),
    };
    return { ...feature1, properties };
  });
}

async function loadFeaturesFromApi(
  layer: ImpactLayerProps,
  baselineData: BaselineLayerData,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  extent?: Extent,
  date?: number,
): Promise<GeoJsonBoundary[]> {
  const { wcsConfig } = hazardLayerDef;
  const { scale, offset } = wcsConfig || {};

  const wcsUrl = getWCSLayerUrl({
    layer: hazardLayerDef,
    extent,
    date,
  } as LayerDataParams<WMSLayerProps>);

  const statsApi = layer.api as StatsApi;
  const apiUrl = statsApi.url;

  const apiData = {
    geotiff_url: wcsUrl,
    zones_url: statsApi.zonesUrl,
    group_by: statsApi.groupBy,
    geojson_out: 'false',
  };

  const aggregateData = await fetchApiData(apiUrl, apiData);

  const mergedFeatures = mergeFeaturesByProperty(
    baselineData.features.features,
    aggregateData,
    statsApi.groupBy,
    operation,
  );

  return mergedFeatures.filter(feature => {
    const scaled = scaleValueIfDefined(
      get(feature, ['properties', operation]),
      scale,
      offset,
    );
    return thresholdOrNaN(scaled, layer.threshold);
  }) as GeoJsonBoundary[];
}

async function loadFeaturesClientSide(
  api: ThunkApi,
  layer: ImpactLayerProps,
  adminBoundaries: BoundaryLayerData,
  baselineData: BaselineLayerData,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  extent?: Extent,
  date?: number,
): Promise<GeoJsonBoundary[]> {
  const { getState, dispatch } = api;

  const { wcsConfig } = hazardLayerDef;
  const { noData, scale, offset } = wcsConfig || {};

  const existingHazardLayer = layerDataSelector(
    layer.hazardLayer,
    date,
  )(getState());

  if (!existingHazardLayer) {
    await dispatch(
      loadLayerData({
        layer: hazardLayerDef,
        extent,
        date,
      } as LayerDataParams<WMSLayerProps>),
    );
  }

  const hazardLayer = checkRasterLayerData(
    layerDataSelector(layer.hazardLayer, date)(getState())!,
  );
  const {
    data: { rasters, transform, image },
  } = hazardLayer;

  // Calculate a bounding box for each feature that we have baseline data for
  const matchingFeatures = adminBoundaries.features.reduce(
    (acc, f) => {
      const feature = f as GeoJsonBoundary;
      const baseline =
        featureIntersectsImage(feature, image) &&
        getBaselineDataForFeature(feature, baselineData);
      return baseline
        ? acc.concat({
            id: baseline.adminKey,
            baseline,
            feature,
            bounds: bbox(feature),
          })
        : acc;
    },
    [] as {
      id: string;
      baseline: BaselineRecord;
      feature: GeoJsonBoundary;
      bounds: ReturnType<typeof bbox>;
    }[],
  );

  // Loop over the features and grab pixels that are contained by the feature.
  const buckets = matchingFeatures.reduce((acc, { id, feature }) => {
    const contained = pixelsInFeature(
      feature,
      rasters[0],
      rasters.width,
      transform,
    );
    return contained.length > 0 ? { ...acc, [id]: contained } : acc;
  }, {} as { [key: string]: number[] });

  return matchingFeatures.reduce((acc, { id, feature, baseline }) => {
    const values = buckets[id];

    if (values) {
      const raw = operations[operation](
        noData ? values.filter(value => value !== noData) : values,
      );
      const scaled = scaleValueIfDefined(raw, scale, offset);
      const aggregateValue = thresholdOrNaN(scaled, layer.threshold);
      if (!Number.isNaN(aggregateValue)) {
        const { properties } = feature;

        const baselineValue = isString(baseline.value)
          ? parseFloat(baseline.value)
          : baseline.value;
        return isNull(baselineValue)
          ? acc
          : acc.concat({
              ...feature,
              properties: {
                ...properties,
                [operation]: aggregateValue,
                impactValue: baselineValue,
              },
            });
      }
    }
    return acc;
  }, [] as GeoJsonBoundary[]);
}

export async function fetchImpactLayerData(
  params: LayerDataParams<ImpactLayerProps>,
  api: ThunkApi,
) {
  const { getState, dispatch } = api;
  const { layer, extent, date } = params;

  const operation = layer.operation || 'median';

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
}
