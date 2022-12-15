import { FeatureCollection } from 'geojson';
import { compact, get, isNull, isString, pick } from 'lodash';
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

export async function getAdminLevelDataLayerData({
  data,
  fallbackLayersData,
  fallbackLayers,
  adminLevelDataLayerProps,
  getState,
}: {
  data: { [key: string]: any }[];
  fallbackLayersData?: { [key: string]: any }[][];
  fallbackLayers?: AdminLevelDataLayerProps[] | undefined;
  adminLevelDataLayerProps: Pick<
    AdminLevelDataLayerProps,
    'boundary' | 'adminCode' | 'dataField' | 'featureInfoProps'
  >;
  getState: () => RootState;
}) {
  const {
    adminCode,
    boundary,
    dataField,
    featureInfoProps,
  } = adminLevelDataLayerProps;
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
  // TEMP - add a 15s wait time to load admin boundaries which are very large
  // WARNING - This is a hack and should be replaced by a better handling of admin boundaries.
  // TODO - make sure we only run this once.
  if (!adminBoundariesLayer || !adminBoundariesLayer.data) {
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  if (!adminBoundariesLayer || !adminBoundariesLayer.data) {
    // TODO we are assuming here it's already loaded. In the future if layers can be preloaded like boundary this will break.
    throw new Error('Boundary Layer not loaded!');
  }
  const adminBoundaries = adminBoundariesLayer.data;
  const adminBoundaryFeatureProps = adminBoundaries.features.map(feature =>
    pick(feature.properties, [
      adminBoundaryLayer.adminCode,
      ...adminBoundaryLayer.adminLevelNames,
      ...adminBoundaryLayer.adminLevelLocalNames,
    ]),
  );
  const layerData: DataRecord[] = compact(
    adminBoundaryFeatureProps.map(adminBoundaryFeatureProp => {
      const adminKey = adminBoundaryFeatureProp![adminBoundaryLayer.adminCode];
      const matchedData = data.find(
        dataProperty => dataProperty[adminCode] === adminKey,
      );

      let fallbackValue: number | string | undefined;
      let fallbackLayerId: string | undefined;
      if (!matchedData && fallbackLayersData && fallbackLayers) {
        const matchedFallbackData = fallbackLayersData
          .map((fallbackLayerData, layerIndex) => {
            const fallbackLayerAdminCode =
              fallbackLayers[layerIndex].adminCode ?? '';
            const fallbackValueKey = fallbackLayers[layerIndex].dataField;
            const fallbackBoundaryData = fallbackLayerData.find(dataProperty =>
              adminKey.startsWith(dataProperty[fallbackLayerAdminCode]),
            );
            const layerId = fallbackLayers[layerIndex].id;
            const layerValue = fallbackBoundaryData
              ? fallbackBoundaryData[fallbackValueKey]
              : undefined;
            return { layerId, layerValue };
          })
          .find(item => item.layerValue);
        fallbackLayerId = matchedFallbackData?.layerId;
        fallbackValue = matchedFallbackData?.layerValue;
      }

      if (!matchedData && !fallbackValue) {
        return undefined;
      }

      const featureInfoPropsValues = matchedData
        ? Object.keys(featureInfoProps || {}).reduce((obj, item) => {
            return {
              ...obj,
              [item]: matchedData[item],
            };
          }, {})
        : {};

      return {
        adminKey,
        ...pick(adminBoundaryFeatureProp, [
          ...adminBoundaryLayer.adminLevelNames,
          ...adminBoundaryLayer.adminLevelLocalNames,
        ]),
        value: matchedData ? matchedData[dataField] : fallbackValue,
        fallbackLayerId,
        ...featureInfoPropsValues,
      } as DataRecord;
    }),
  );

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const adminBoundaryCode = get(
          properties,
          adminBoundaryLayer.adminCode,
        ) as string;
        if (!adminBoundaryCode) {
          console.warn(
            `There seem to be an issue with the admin boundary file ${adminBoundaryLayer.id}.
             Some properties are missing the admin code ${adminBoundaryLayer.adminCode}`,
          );
        }

        const matchProperties = layerData.find(({ adminKey }) =>
          adminBoundaryCode?.startsWith(adminKey),
        );

        if (matchProperties && !isNull(matchProperties.value)) {
          // console.log({ matchProperties });
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
  const {
    adminCode,
    dataField,
    featureInfoProps,
    boundary,
    backupAdminLevelDataLayers,
  } = layer;

  const fallbackLayers = backupAdminLevelDataLayers?.map(
    backupLayerKey =>
      LayerDefinitions[backupLayerKey] as AdminLevelDataLayerProps,
  );

  const [layerData, ...fallbackLayersData] = await Promise.all(
    [layer, ...(fallbackLayers ?? [])].map(async adminLevelDataLayer => {
      // format brackets inside config URL with moment
      // example: "&date={YYYY-MM-DD}" will turn into "&date=2021-04-27"
      const datedPath = adminLevelDataLayer.path.replace(/{.*?}/g, match => {
        const format = match.slice(1, -1);
        return moment(date).format(format);
      });

      // TODO avoid any use, the json should be typed. See issue #307
      const data: { [key: string]: any }[] = (
        await (
          await fetch(datedPath, {
            mode: adminLevelDataLayer.path.includes('http')
              ? 'cors'
              : 'same-origin',
          })
        ).json()
      ).DataList;

      return data;
    }),
  );

  return getAdminLevelDataLayerData({
    data: layerData,
    fallbackLayersData,
    fallbackLayers,
    adminLevelDataLayerProps: {
      boundary,
      adminCode,
      dataField,
      featureInfoProps,
    },
    getState: api.getState,
  });
};
