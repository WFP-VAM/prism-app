import { FeatureCollection } from 'geojson';
import { compact, get, isNull, isString, pick } from 'lodash';
import {
  BoundaryLayerProps,
  AdminLevelDataLayerProps,
  LayerKey,
} from 'config/types';
import type { AppDispatch, ThunkApi } from 'context/store';
import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import { boundaryCache } from 'utils/boundary-cache';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { getFormattedDate } from 'utils/date-utils';
import type { LayerDataParams, LazyLoader } from './layer-data';

export type DataRecord = {
  adminKey: string; // refers to a specific admin boundary feature (cell on map). Could be several based off admin level
  value: string | number | null;
};

export interface AdminLevelDataLayerData extends FeatureCollection {
  layerData: DataRecord[];
}

export async function getAdminLevelDataLayerData({
  data,
  fallbackLayersData,
  fallbackLayers,
  adminLevelDataLayerProps,
  dispatch,
}: {
  data: { [key: string]: any }[];
  fallbackLayersData?: { [key: string]: any }[][];
  fallbackLayers?: AdminLevelDataLayerProps[] | undefined;
  adminLevelDataLayerProps: Partial<
    Pick<
      AdminLevelDataLayerProps,
      'boundary' | 'adminCode' | 'dataField' | 'featureInfoProps' | 'adminLevel'
    >
  >;
  dispatch: AppDispatch;
}) {
  const { adminCode, boundary, dataField, featureInfoProps, adminLevel } =
    adminLevelDataLayerProps;
  // check unique boundary layer presence into this layer
  // use the boundary once available or
  // use the default boundary singleton instead
  const adminBoundaryLayer =
    boundary !== undefined
      ? (LayerDefinitions[boundary as LayerKey] as BoundaryLayerProps)
      : getBoundaryLayerSingleton();

  // Use global boundary cache
  const adminBoundaries = await boundaryCache.getBoundaryData(
    adminBoundaryLayer,
    dispatch,
  );
  if (!adminBoundaries) {
    throw new Error('Boundary Layer not loaded!');
  }
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
        dataProperty => dataProperty[adminCode!] === adminKey,
      );

      let fallbackValue: number | string | undefined;
      let fallbackAdminLevel: number | undefined;
      let fallbackFeatureInfoPropsValues: { [key: string]: any } | undefined;
      if (!matchedData && fallbackLayersData && fallbackLayers) {
        // Layers can have multiple fallback layers
        // Need to get the first instance where there exists fallback data for the district
        const matchedFallbackData = fallbackLayersData
          .map((fallbackLayerData, layerIndex) => {
            const fallbackLayerAdminCode =
              fallbackLayers[layerIndex].adminCode ?? '';
            const fallbackValueKey = fallbackLayers[layerIndex].dataField;
            // Find the fallback data for the district
            // Fallback admin keys will be a prefix of its current admin key
            const fallbackData = fallbackLayerData.find(dataProperty =>
              adminKey.startsWith(dataProperty[fallbackLayerAdminCode]),
            );
            const {
              adminLevel: fallbackLayerAdminLevel,
              id: layerId,
              featureInfoProps: fallbackFeatureInfoProps,
            } = fallbackLayers[layerIndex];
            const layerValue = fallbackData
              ? fallbackData[fallbackValueKey]
              : undefined;

            const tempFeatureInfoPropsValues:
              | { [key: string]: any }
              | undefined = fallbackData
              ? Object.keys(fallbackFeatureInfoProps || {}).reduce(
                  (obj, item) => ({
                    ...obj,
                    [item]: fallbackData![item],
                  }),
                  {},
                )
              : {};

            return {
              fallbackAdminLevel: fallbackLayerAdminLevel,
              layerId,
              layerValue,
              tempFeatureInfoPropsValues,
            };
          })
          .find(item => !isNull(item.layerValue));

        fallbackAdminLevel = matchedFallbackData?.fallbackAdminLevel;

        fallbackValue = matchedFallbackData?.layerValue;

        fallbackFeatureInfoPropsValues =
          matchedFallbackData?.tempFeatureInfoPropsValues;
      }

      if (!matchedData && fallbackValue === undefined) {
        return undefined;
      }

      const featureInfoPropsValues = matchedData
        ? Object.keys(featureInfoProps || {}).reduce(
            (obj, item) => ({
              ...obj,
              [item]: matchedData[item],
            }),
            {},
          )
        : {};

      return {
        adminKey,
        ...pick(adminBoundaryFeatureProp, [
          ...adminBoundaryLayer.adminLevelNames,
          ...adminBoundaryLayer.adminLevelLocalNames,
        ]),
        value: matchedData ? matchedData[dataField!] : fallbackValue,
        adminLevel: fallbackAdminLevel ?? adminLevel,
        ...fallbackFeatureInfoPropsValues,
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
              [dataField!]: value,
            },
          };
        }
        return undefined;
      })
      .filter(f => f !== undefined),
  } as FeatureCollection;
  return {
    ...features,
    layerData,
  } as AdminLevelDataLayerData;
}

export const fetchAdminLevelDataLayerData: LazyLoader<
  AdminLevelDataLayerProps
> =
  () =>
  async (
    { layer, date }: LayerDataParams<AdminLevelDataLayerProps>,
    api: ThunkApi,
  ) => {
    const {
      adminCode,
      dataField,
      featureInfoProps,
      boundary,
      fallbackLayerKeys,
      adminLevel,
      requestBody,
    } = layer;

    const fallbackLayers = fallbackLayerKeys?.map(
      backupLayerKey =>
        LayerDefinitions[backupLayerKey] as AdminLevelDataLayerProps,
    );

    const [layerData, ...fallbackLayersData] = await Promise.all(
      [layer, ...(fallbackLayers ?? [])].map(
        async (adminLevelDataLayer, index) => {
          // format brackets inside config URL
          // example: "&date={YYYY-MM-DD}" will turn into "&date=2021-04-27"
          const datedPath = adminLevelDataLayer.path.replace(
            /{.*?}/g,
            match => {
              const format = match.slice(1, -1);
              return getFormattedDate(date, format as any) as string;
            },
          );

          const requestMode: 'cors' | 'same-origin' =
            adminLevelDataLayer.path.includes('http') ? 'cors' : 'same-origin';

          // Suppress notifications for fallback layers (index > 0) since they're expected to potentially fail
          const options = {
            method: requestBody ? 'POST' : 'GET',
            headers: requestBody
              ? { 'Content-Type': 'application/json' }
              : undefined,
            body: requestBody ? JSON.stringify(requestBody) : undefined,
            mode: requestMode,
            suppressNotification: index > 0,
          };

          try {
            // TODO avoid any use, the json should be typed. See issue #307
            const response = await fetchWithTimeout(
              datedPath,
              api.dispatch,
              options,
              `Request failed for fetching admin level data at ${adminLevelDataLayer.path}`,
            );

            const data: { [key: string]: any }[] = (await response.json())
              ?.DataList;
            return data;
          } catch {
            return [{}];
          }
        },
      ),
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
        adminLevel,
      },
      dispatch: api.dispatch,
    });
  };
