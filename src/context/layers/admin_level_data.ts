import { FeatureCollection } from 'geojson';
import { get, isNull, isString } from 'lodash';
import moment from 'moment';
import {
  BoundaryLayerProps,
  AdminLevelDataLayerProps,
  LayerKey,
} from '../../config/types';
import type { RootState, ThunkApi } from '../store';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../config/utils';
import type { LayerData, LayerDataParams, LazyLoader } from './layer-data';
import { layerDataSelector } from '../mapStateSlice/selectors';

export type DataRecord = {
  adminKey: string; // refers to a specific admin boundary feature (cell on map). Could be several based off admin level
  value: string | number | null;
};

export type AdminLevelDataLayerData = {
  features: FeatureCollection;
  layerData: DataRecord[];
};

export function getAdminLevelDataLayerData(
  data: { [key: string]: any }[],
  {
    boundary,
    adminCode,
    dataField,
    featureInfoProps,
  }: Pick<
    AdminLevelDataLayerProps,
    'boundary' | 'adminCode' | 'dataField' | 'featureInfoProps'
  >,
  getState: () => RootState,
) {
  // check unique boundary layer presence into this layer
  // use the boundary once available or
  // use the default boundary singleton instead
  const adminBoundaryLayer =
    boundary !== undefined
      ? (LayerDefinitions[boundary as LayerKey] as BoundaryLayerProps)
      : getBoundaryLayerSingleton();

  const adminBoundariesLayer = layerDataSelector(adminBoundaryLayer.id)(
    getState(),
  ) as LayerData<BoundaryLayerProps> | undefined;
  if (!adminBoundariesLayer || !adminBoundariesLayer.data) {
    // TODO we are assuming here it's already loaded. In the future if layers can be preloaded like boundary this will break.
    throw new Error('Boundary Layer not loaded!');
  }
  const adminBoundaries = adminBoundariesLayer.data;

  const layerData = (data || [])
    .map(point => {
      const adminKey = point[adminCode] as string;
      if (!adminKey) {
        return undefined;
      }
      const value = get(point, dataField);
      const featureInfoPropsValues = Object.keys(featureInfoProps || {}).reduce(
        (obj, item) => {
          return {
            ...obj,
            [item]: point[item],
          };
        },
        {},
      );
      return { adminKey, value, ...featureInfoPropsValues } as DataRecord;
    })
    .filter((v): v is DataRecord => v !== undefined);

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const adminBoundaryCode = get(
          properties,
          adminBoundaryLayer.adminCode,
        ) as string;
        const matchProperties = layerData.find(({ adminKey }) =>
          adminBoundaryCode.startsWith(adminKey),
        );
        if (matchProperties && !isNull(matchProperties.value)) {
          // Do we want support for non-numeric values (like string colors?)
          const value = isString(matchProperties.value)
            ? parseFloat(matchProperties.value)
            : matchProperties.value;
          return {
            ...feature,
            properties: {
              ...properties,
              ...matchProperties,
              // TODO - standardize the field we use to store that data
              // Some functions use "dataField" while others use "data"
              data: value,
              [dataField]: value,
            },
          };
        }
        return undefined;
      })
      .filter(f => f !== undefined),
  } as FeatureCollection;
  return {
    features,
    layerData,
  };
}

export const fetchAdminLevelDataLayerData: LazyLoader<AdminLevelDataLayerProps> = () => async (
  { layer, date }: LayerDataParams<AdminLevelDataLayerProps>,
  api: ThunkApi,
) => {
  const { path, adminCode, dataField, featureInfoProps, boundary } = layer;

  // format brackets inside config URL with moment
  // example: "&date={YYYY-MM-DD}" will turn into "&date=2021-04-27"
  const datedPath = path.replace(/{.*?}/g, match => {
    const format = match.slice(1, -1);
    return moment(date).format(format);
  });

  // TODO avoid any use, the json should be typed. See issue #307
  const data: { [key: string]: any }[] = (
    await (
      await fetch(datedPath, {
        mode: path.includes('http') ? 'cors' : 'same-origin',
      })
    ).json()
  ).DataList;

  return getAdminLevelDataLayerData(
    data,
    { boundary, adminCode, dataField, featureInfoProps },
    api.getState,
  );
};
