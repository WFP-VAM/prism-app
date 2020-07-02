import { get, has, isNull, isString } from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import bbox from '@turf/bbox';
import {
  LayerData,
  LayerDataParams,
  loadLayerData,
} from '../context/layers/layer-data';
import {
  AggregationOperations,
  AsyncReturnType,
  ImpactLayerProps,
  LayerType,
  StatsApi,
  ThresholdDefinition,
  WMSLayerProps,
} from '../config/types';
import { ThunkApi } from '../context/store';
import { layerDataSelector } from '../context/mapStateSlice';
import {
  Extent,
  featureIntersectsImage,
  GeoJsonBoundary,
  pixelsInFeature,
} from '../components/MapView/Layers/raster-utils';
import { BoundaryLayerData } from '../context/layers/boundary';
import { NSOLayerData } from '../context/layers/nso';
import { getWCSLayerUrl, WMSLayerData } from '../context/layers/wms';

export type ImpactLayerData = {
  boundaries: FeatureCollection;
  impactFeatures: FeatureCollection;
};

export type BaselineLayerData = NSOLayerData;
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
export const checkBaselineDataLayer = (
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

/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: ReturnType<typeof getWCSLayerUrl>; // helps developers get an understanding of what might go here, despite the type eventually being a string.
  zones_url: string;
  group_by?: string;
  geojson_out?: boolean;
};

export async function fetchApiData(
  url: string,
  apiData: ApiData,
): Promise<Array<object>> {
  return (
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
}

export function generateFeaturesFromApiData(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  hazardLayerDef: WMSLayerProps,
  baselineData: NSOLayerData,
  groupBy: StatsApi['groupBy'],
  operation: AggregationOperations,

  threshold: ThresholdDefinition,
): GeoJsonBoundary[] {
  const { wcsConfig } = hazardLayerDef;
  const { scale, offset } = wcsConfig || {};
  const mergedFeatures = mergeFeaturesByProperty(
    baselineData.features.features,
    aggregateData,
    groupBy,
    operation,
  );

  return mergedFeatures.filter(feature => {
    const scaled = scaleValueIfDefined(
      get(feature, ['properties', operation]),
      scale,
      offset,
    );

    return !Number.isNaN(thresholdOrNaN(scaled, threshold));
  }) as GeoJsonBoundary[];
}

export async function loadFeaturesFromApi(
  layer: ImpactLayerProps,
  baselineData: BaselineLayerData,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  extent?: Extent,
  date?: number,
): Promise<GeoJsonBoundary[]> {
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
    geojson_out: false,
  };

  const aggregateData = await fetchApiData(apiUrl, apiData);
  return generateFeaturesFromApiData(
    aggregateData,
    hazardLayerDef,
    baselineData,
    statsApi.groupBy,
    operation,

    layer.threshold,
  );
}

export async function loadFeaturesClientSide(
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
