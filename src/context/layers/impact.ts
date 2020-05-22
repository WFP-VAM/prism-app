import { has, isString, isNull } from 'lodash';
import { FeatureCollection } from 'geojson';
import { LayerData, LayerDataParams, loadLayerData } from './layer-data';
import {
  ImpactLayerProps,
  LayerType,
  NSOLayerProps,
  WMSLayerProps,
} from '../../config/types';
import { ThunkApi } from '../store';
import { layerDataSelector } from '../mapStateSlice';
import { LayerDefinitions } from '../../config/utils';
import {
  featureIntersectsImage,
  filterPointsByFeature,
  GeoJsonBoundary,
  indexToGeoCoords,
} from '../../components/MapView/Layers/raster-utils';
import { NSOLayerData } from './nso';
import { WMSLayerData } from './wms';
import adminBoundariesRaw from '../../config/admin_boundaries.json';

const adminBoundaries = adminBoundariesRaw as FeatureCollection;

export type ImpactLayerData = FeatureCollection;

type BaselineLayerData = NSOLayerData;
type RasterLayer = LayerData<WMSLayerProps>;

type DataArray = { value: number }[];

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
  mean: (data: DataArray) =>
    data.reduce((sum, { value }) => sum + value, 0) / data.length,
  median: (data: DataArray) => {
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedValues = data.map(({ value }) => value).sort();
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

function thresholdOrNaN(value: number, threshold?: number) {
  if (threshold === undefined) {
    return value;
  }
  if (threshold >= 0) {
    return value >= threshold ? value : NaN;
  }
  return value <= threshold ? value : NaN;
}

export async function fetchImpactLayerData(
  params: LayerDataParams<ImpactLayerProps>,
  api: ThunkApi,
) {
  const { getState, dispatch } = api;
  const { layer, extent } = params;

  const existingHazardLayer = layerDataSelector(layer.hazardLayer)(getState());

  if (!existingHazardLayer) {
    const hazardLayerDef = LayerDefinitions[layer.hazardLayer];
    await dispatch(
      loadLayerData({ layer: hazardLayerDef, extent } as LayerDataParams<
        WMSLayerProps
      >),
    );
  }

  // eslint-disable-next-line fp/no-mutation
  const hazardLayer = checkRasterLayerData(
    layerDataSelector(layer.hazardLayer)(getState())!,
  );
  const {
    layer: { wcsConfig: { noData, scale, offset } = {}},
    data: { rasters, transform, image },
  } = hazardLayer;

  const allPoints = Array.from(rasters[0], (value, i) => ({
    ...indexToGeoCoords(i, rasters.width, transform),
    value,
  }));

  const operation = layer.operation || 'median';

  const features = adminBoundaries.features.map(f => {
    const feature = f as GeoJsonBoundary;
    const { properties } = feature;
    let aggregateValue;

    if (featureIntersectsImage(feature, image)) {
      const points = filterPointsByFeature(allPoints, feature);
      const raw = operations[operation](
        noData ? points.filter(({ value }) => value !== noData) : points,
      );
      const scaled = scaleValueIfDefined(raw, scale, offset);

      // eslint-disable-next-line fp/no-mutation
      aggregateValue = thresholdOrNaN(scaled, layer.threshold);
    } else {
      // eslint-disable-next-line fp/no-mutation
      aggregateValue = NaN;
    }

    return {
      ...feature,
      properties: {
        ...properties,
        [operation]: aggregateValue,
      },
    };
  });

  const baselineLayer = layerDataSelector(layer.baselineLayer)(getState());

  let baselineData: BaselineLayerData;
  if (!baselineLayer) {
    const baselineLayerDef = LayerDefinitions[layer.baselineLayer];
    const {
      payload: { data: { data } = {}},
    } = (await dispatch(
      loadLayerData({ layer: baselineLayerDef, extent } as LayerDataParams<
        NSOLayerProps
      >),
    )) as { payload: { data?: { data: unknown } } };
    // eslint-disable-next-line fp/no-mutation
    baselineData = checkBaselineDataLayer(layer.baselineLayer, data);
  } else {
    // eslint-disable-next-line fp/no-mutation
    baselineData = checkBaselineDataLayer(
      layer.baselineLayer,
      baselineLayer.data,
    );
  }

  return {
    ...adminBoundaries,
    features: features
      .filter(f => !Number.isNaN(f.properties![operation]))
      .map(feature => {
        const { NSO_CODE: nsoCode } = feature.properties!;
        let { value: baselineValue } =
          baselineData.layerData.find(
            ({ adminKey }) => nsoCode.indexOf(adminKey) === 0,
          ) || {};

        if (isString(baselineValue)) {
          // eslint-disable-next-line fp/no-mutation
          baselineValue = parseFloat(baselineValue);
        } else if (isNull(baselineValue)) {
          return feature;
        }

        return {
          ...feature,
          properties: {
            ...feature.properties,
            impactValue: baselineValue,
          },
        };
      }),
  };
}
