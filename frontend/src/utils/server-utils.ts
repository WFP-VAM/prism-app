import { get, merge, snakeCase, sortBy, sortedUniqBy } from 'lodash';
import moment from 'moment';
import { WFS, WMS, fetchCoverageLayerDays, formatUrl } from 'prism-common';
import { Dispatch } from 'redux';
import { appConfig } from '../config';
import type {
  AvailableDates,
  PathLayer,
  PointDataLayerProps,
  RequestFeatureInfo,
  ValidityLayer,
  ValidityPeriod,
} from '../config/types';
import {
  AdminLevelDataLayerProps,
  DataType,
  DateItem,
  DatesPropagation,
  FeatureInfoType,
  ImpactLayerProps,
  PointDataLoader,
  StaticRasterLayerProps,
  WMSLayerProps,
} from '../config/types';

import { addNotification } from '../context/notificationStateSlice';
import { fetchACLEDDates } from './acled-utils';
import {
  StartEndDate,
  datesAreEqualWithoutTime,
  generateDateItemsRange,
  generateDatesRange,
} from './date-utils';
import { LocalError } from './error-utils';
import { createEWSDatesArray } from './ews-utils';
import { fetchWithTimeout } from './fetch-with-timeout';
import { queryParamsToString } from './url-utils';
import { LayerDefinitions } from '../config/utils';

/**
 * Function that gets the correct date used to make the request. If available dates is undefined. Return selectedDate as default.
 *
 * @return unix timestamp
 */
export const getRequestDate = (
  layerAvailableDates: DateItem[] | undefined,
  selectedDate?: number,
): number | undefined => {
  if (!selectedDate) {
    return undefined;
  }

  if (!layerAvailableDates) {
    return selectedDate;
  }

  const dateItem = layerAvailableDates.find(date => {
    return datesAreEqualWithoutTime(date.displayDate, selectedDate);
  });
  if (!dateItem) {
    return layerAvailableDates[layerAvailableDates.length - 1].queryDate;
  }

  return dateItem.queryDate;
};

// Note: PRISM's date picker is designed to work with dates in the UTC timezone
// Therefore, ambiguous dates (dates passed as string e.g 2020-08-01) shouldn't be calculated from the user's timezone and instead be converted directly to UTC. Possibly with moment.utc(string)

export type DateCompatibleLayer =
  | AdminLevelDataLayerProps
  | WMSLayerProps
  | ImpactLayerProps
  | PointDataLayerProps
  | StaticRasterLayerProps;

export const getPossibleDatesForLayer = (
  layer: DateCompatibleLayer,
  serverAvailableDates: AvailableDates,
  // eslint-disable-next-line consistent-return
): DateItem[] => {
  switch (layer.type) {
    case 'wms':
      return serverAvailableDates[layer.serverLayerName];
    case 'impact':
      return serverAvailableDates[
        (LayerDefinitions[layer.hazardLayer] as WMSLayerProps).serverLayerName
      ];
    case 'point_data':
    case 'admin_level_data':
      return serverAvailableDates[layer.id];
    case 'static_raster':
      return serverAvailableDates[layer.id];
    default:
      return [];
  }
};

type PointDataDates = Array<{
  date: string;
}>;
// used to cache repeat date requests to same URL
const pointDataFetchPromises: {
  [k in PointDataLayerProps['dateUrl']]: Promise<PointDataDates>;
} = {};

const loadPointLayerDataFromURL = async (
  fetchUrl: string,
  layerId: string,
  dispatch: Dispatch,
  fallbackUrl?: string,
): Promise<PointDataDates> => {
  try {
    if (!fetchUrl) {
      throw new LocalError(
        'load point layer data from url failed because fetchUrl is missing',
      );
    }
    const response = await fetchWithTimeout(
      fetchUrl,
      dispatch,
      {},
      `Impossible to get point data dates for ${layerId}`,
    );
    return (await response.json()) as PointDataDates;
  } catch (error) {
    if (!fetchUrl && fallbackUrl) {
      dispatch(
        addNotification({
          message: `Failed loading point data layer: ${layerId}. Attempting to load fallback URL...`,
          type: 'warning',
        }),
      );
      return loadPointLayerDataFromURL(fallbackUrl || '', layerId, dispatch);
    }
    if ((!fetchUrl && !fallbackUrl) || error instanceof LocalError) {
      console.error(error);
      dispatch(
        addNotification({
          message: (error as Error).message,
          type: 'warning',
        }),
      );
    }
    return [];
  }
};

/**
 * Gets the available dates for a point data layer.
 */
const getPointDataCoverage = async (
  layer: PointDataLayerProps,
  dispatch: Dispatch,
) => {
  const {
    dateUrl: url,
    fallbackData: fallbackUrl,
    id,
    additionalQueryParams,
    loader,
  } = layer;

  // TODO - merge formatUrl and queryParamsToString
  const fetchUrlWithParams = `${url}${
    url.includes('?') ? '&' : '?'
  }${queryParamsToString(additionalQueryParams)}`;

  switch (loader) {
    case PointDataLoader.EWS:
      return createEWSDatesArray();
    case PointDataLoader.ACLED:
      return fetchACLEDDates(url, dispatch, additionalQueryParams);
    default:
      break;
  }

  // eslint-disable-next-line fp/no-mutation
  const data = await (pointDataFetchPromises[fetchUrlWithParams] =
    pointDataFetchPromises[fetchUrlWithParams] ||
    loadPointLayerDataFromURL(fetchUrlWithParams, id, dispatch, fallbackUrl));

  return (
    data
      // adding 12 hours to avoid  errors due to daylight saving, and convert to number
      .map(item => moment.utc(item.date).set({ hour: 12, minute: 0 }).valueOf())
      // remove duplicate dates - indexOf returns first index of item
      .filter((date, index, arr) => {
        return arr.indexOf(date) === index;
      })
  );
};

const getAdminLevelDataCoverage = (layer: AdminLevelDataLayerProps) => {
  const { dates } = layer;
  if (!dates) {
    return [];
  }
  // raw data comes in as {"dates": ["YYYY-MM-DD"]}
  return dates.map(v => moment(v, 'YYYY-MM-DD').valueOf());
};

const getStaticRasterDataCoverage = (layer: StaticRasterLayerProps) => {
  const { dates } = layer;
  if (!dates) {
    return [];
  }
  // raw data comes in as {"dates": ["YYYY-MM-DD"]}
  return dates.map(v => moment(v, 'YYYY-MM-DD').valueOf());
};

/**
 * Creates DateItem object whose fields have the same value.
 *
 * @return DateItem
 */
const generateDefaultDateItem = (date: number, baseItem?: Object): DateItem => {
  const newDate = new Date(date).setHours(12, 0, 0);
  const r = {
    displayDate: newDate,
    queryDate: newDate,
  };
  if (baseItem) {
    return {
      ...r,
      ...baseItem,
    };
  }
  return r;
};

/**
 * Generate intermediate date items using start_date and end_date field
 * for every available file ressources
 */
async function generateIntermediateDateItemFromDataFile(
  layerDates: number[],
  layerPathTemplate: string,
  validityPeriod: ValidityPeriod,
) {
  const ranges: StartEndDate[] = await Promise.all(
    layerDates.map(async r => {
      const path = layerPathTemplate.replace(/{.*?}/g, match => {
        const format = match.slice(1, -1);
        return moment(r).format(format);
      });

      const res = await fetch(path);

      const contentType = res.headers.get('content-type');
      if (!contentType || contentType.indexOf('application/json') === -1) {
        console.error(
          `Wrong date / path configuration : ${path}, does not exist`,
        );
        return {};
      }
      if (!res.ok) {
        console.error(`Could not load data file for ressource: ${path}`);
        return {};
      }
      const jsonBody = await res.json();

      const startDate = jsonBody.DataList[0][validityPeriod.start_date_field];
      const endDate = jsonBody.DataList[0][validityPeriod.end_date_field];

      return {
        startDate: moment(startDate).set({ hour: 12, minute: 0 }).valueOf(),
        endDate: moment(endDate).set({ hour: 12, minute: 0 }).valueOf(),
      };
    }),
  );

  const rangesWithoutMissing = ranges.filter(ra => ra.startDate && ra.endDate);
  return generateDateItemsRange(rangesWithoutMissing);
}

function generateIntermediateDateItemFromValidity(layer: ValidityLayer) {
  const { dates } = layer;
  const { days, mode } = layer.validity;

  const sortedDates = Array.prototype.sort.call(dates);

  // Generate first DateItem[] from dates array.
  const baseItem = layer.validity
    ? {
        isStartDate:
          mode === DatesPropagation.FORWARD || mode === DatesPropagation.BOTH,
        isEndDate:
          mode === DatesPropagation.BACKWARD || mode === DatesPropagation.BOTH,
      }
    : {};
  const dateItemsDefault = sortedDates.map(sortedDate =>
    generateDefaultDateItem(sortedDate, baseItem),
  );

  // only calculate validity for dates that are less than 5 years old
  const fiveYearsInMs = 5 * 365 * 24 * 60 * 60 * 1000;
  const earliestDate = Date.now() - fiveYearsInMs;

  const dateItemsWithValidity = sortedDates
    .filter(date => date > earliestDate)
    .map(d => moment(d).set({ hour: 12, minute: 0 }))
    .reduce((acc: DateItem[], momentDate) => {
      // We create the start and the end date for every moment date
      let startDate = momentDate.clone();
      let endDate = momentDate.clone();

      // if the mode is `both` or backward we add the days of the validity to the end date keeping the startDate as it is
      if (mode === DatesPropagation.BOTH || mode === DatesPropagation.FORWARD) {
        // eslint-disable-next-line fp/no-mutation
        endDate = endDate.add(days, 'days');
      }

      // if the mode is `both` or `forward` we subtract the days of the validity to the start date keeping the endDate as it is
      if (
        mode === DatesPropagation.BOTH ||
        mode === DatesPropagation.BACKWARD
      ) {
        // eslint-disable-next-line fp/no-mutation
        startDate = startDate.subtract(days, 'days');
      }

      // We create an array with the diff between the endDate and startDate and we create an array with the addition of the days in the startDate
      const daysToAdd = generateDatesRange(startDate, endDate);

      // convert the available days for a specific moment day to the DefaultDate format
      const dateItemsToAdd = daysToAdd.map(dateToAdd => ({
        displayDate: dateToAdd,
        queryDate: momentDate.valueOf(),
      }));

      // We filter the dates that don't include the displayDate of the previous item array
      const filteredDateItems = acc.filter(
        dateItem => !daysToAdd.includes(dateItem.displayDate),
      );

      return [...filteredDateItems, ...dateItemsToAdd];
    }, []);

  // We sort the defaultDateItems and the dateItemsWithValidity and we order by displayDate to filter the duplicates
  // or the overlapping dates
  return sortedUniqBy(
    sortBy([...dateItemsDefault, ...dateItemsWithValidity], 'displayDate'),
    'displayDate',
  );
}

/**
 * Wrapper function for utility fetchCoverageLayerDays from Common Library
 */
const localFetchCoverageLayerDays = async (
  url: string,
  dispatch: Dispatch,
): Promise<{ [layerId: string]: number[] }> => {
  try {
    return await fetchCoverageLayerDays(url, { fetch: fetchWithTimeout });
  } catch (error) {
    console.error(error);
    if ((error as Error).name === 'AbortError') {
      dispatch(
        addNotification({
          message: `Request at ${url} timeout`,
          type: 'warning',
        }),
      );
    }
    dispatch(
      addNotification({
        message: `fetch coverage layer days request failed at ${url}`,
        type: 'warning',
      }),
    );
    return {};
  }
};

/**
 * Wrapper function for utility getLayerDays from WMS class from Common Library
 */
const localWMSGetLayerDates = async (
  url: string,
  dispatch: Dispatch,
): Promise<{ [layerId: string]: number[] }> => {
  try {
    return await new WMS(url, { fetch: fetchWithTimeout }).getLayerDays();
  } catch (error) {
    console.error(error);
    if ((error as Error).name === 'AbortError') {
      dispatch(
        addNotification({
          message: `Request at ${url} timeout`,
          type: 'warning',
        }),
      );
    }
    dispatch(
      addNotification({
        message: `WMS layer dates request failed at ${url}`,
        type: 'warning',
      }),
    );
    return {};
  }
};

// The layer definitions bluerPrint is used as a schema for the availableDates if a request is failed to be fulfilled
const layerDefinitionsBluePrint: AvailableDates = Object.keys(
  LayerDefinitions,
).reduce((acc, layerDefinitionKey) => {
  const { serverLayerName } = LayerDefinitions[layerDefinitionKey] as any;
  if (!serverLayerName) {
    return {
      ...acc,
    };
  }
  return {
    ...acc,
    [serverLayerName]: [],
  };
}, {});

/**
 * Load available dates for WMS and WCS using a serverUri defined in prism.json and for GeoJSONs (point data) using their API endpoint.
 *
 * @return a Promise of Map<LayerID (not always id from LayerProps but can be), availableDates[]>
 */
export async function getLayersAvailableDates(
  dispatch: Dispatch,
): Promise<AvailableDates> {
  const wmsServerUrls: string[] = get(appConfig, 'serversUrls.wms', []);
  const wcsServerUrls: string[] = get(appConfig, 'serversUrls.wcs', []);

  const pointDataLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is PointDataLayerProps => layer.type === 'point_data',
  );

  const adminWithDateLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is AdminLevelDataLayerProps =>
      layer.type === 'admin_level_data' && Boolean(layer.dates),
  );

  const staticRasterWithDateLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is StaticRasterLayerProps =>
      layer.type === 'static_raster' && Boolean(layer.dates),
  );

  const layerDates = await Promise.all([
    ...wmsServerUrls.map(url => localWMSGetLayerDates(url, dispatch)),
    ...wcsServerUrls.map(url => localFetchCoverageLayerDays(url, dispatch)),
    ...pointDataLayers.map(async layer => ({
      [layer.id]: await getPointDataCoverage(layer, dispatch),
    })),
    ...adminWithDateLayers.map(layer => ({
      [layer.id]: getAdminLevelDataCoverage(layer),
    })),
    ...staticRasterWithDateLayers.map(layer => ({
      [layer.id]: getStaticRasterDataCoverage(layer),
    })),
  ]);

  // Merge all layer types results into a single dictionary of date arrays.
  const mergedLayers: { [key: string]: number[] } = merge({}, ...layerDates);

  // Retrieve layer that have a validity object
  const layersWithValidity: ValidityLayer[] = Object.values(LayerDefinitions)
    .filter(layer => layer.validity !== undefined)
    .map(layer => {
      const layerId = layer.type === 'wms' ? layer.serverLayerName : layer.id;

      return {
        name: layerId,
        dates: mergedLayers[layerId],
        validity: layer.validity!,
      };
    });

  // Retrieve layers that have validityPeriod
  const layersWithValidityStartEndDate: PathLayer[] = Object.values(
    LayerDefinitions,
  )
    .filter(layer => !!(layer as AdminLevelDataLayerProps).validityPeriod)
    .map(layer => {
      const layerId = layer.type === 'wms' ? layer.serverLayerName : layer.id;

      return {
        name: layerId,
        dates: mergedLayers[layerId],
        path: (layer as AdminLevelDataLayerProps).path,
        validityPeriod: (layer as AdminLevelDataLayerProps)
          .validityPeriod as ValidityPeriod,
      };
    });

  // Generate and replace date items for layers with all intermediates dates
  const layerDateItemsMap = await Promise.all(
    Object.entries(mergedLayers).map(
      async (layerDatesEntry: [string, number[]]) => {
        // Generate dates for layers with validity and no path
        const matchingValidityLayer = layersWithValidity.find(
          validityLayer => validityLayer.name === layerDatesEntry[0],
        );

        if (matchingValidityLayer) {
          return {
            [layerDatesEntry[0]]: generateIntermediateDateItemFromValidity(
              matchingValidityLayer,
            ),
          };
        }

        // Generate dates for layers with path
        const matchingPathLayer = layersWithValidityStartEndDate.find(
          validityLayer => validityLayer.name === layerDatesEntry[0],
        );

        if (matchingPathLayer) {
          return {
            [layerDatesEntry[0]]: await generateIntermediateDateItemFromDataFile(
              matchingPathLayer.dates,
              matchingPathLayer.path,
              matchingPathLayer.validityPeriod,
            ),
          };
        }

        // Genererate dates for layers with validity but not an admin_level_data type
        return {
          [layerDatesEntry[0]]: layerDatesEntry[1].map((d: number) =>
            generateDefaultDateItem(new Date(d).setHours(12, 0, 0)),
          ),
        };
      },
    ),
  );

  // eslint-disable-next-line fp/no-mutating-assign
  return Object.assign(layerDefinitionsBluePrint, ...layerDateItemsMap);
}

/**
 * Format value from featureInfo response based on DataType provided
 *
 * @return a formatted string
 */
export function formatFeatureInfo(
  value: string,
  type: DataType,
  labelMap?: { [key: string]: string },
): string {
  if (type === DataType.Date) {
    return `${moment(value).utc().format('MMMM Do YYYY, h:mm:ss')} UTC`;
  }

  if (type === DataType.LabelMapping) {
    if (!labelMap) {
      throw new Error('labelMap not defined.');
    }

    return labelMap[value];
  }

  return value;
}

/**
 * Executes a getFeatureInfo request
 *
 * @return object of key: string - value: string with formatted values given label type.
 */
const runFeatureInfoRequest = async (
  url: string,
  wmsParams: RequestFeatureInfo,
  layers: WMSLayerProps[],
  dispatch: Dispatch,
): Promise<{ [name: string]: string }> => {
  // Transform to snake case.
  const wmsParamsInSnakeCase = Object.entries(wmsParams).reduce(
    (obj, item) => ({
      ...obj,
      [snakeCase(item[0])]: item[1],
    }),
    {},
  );
  const resource = formatUrl(`${url}/ows`, wmsParamsInSnakeCase);
  try {
    const res = await fetchWithTimeout(
      resource,
      dispatch,
      {},
      `Request failed on running feature info request at ${resource}`,
    );

    const resJson: GeoJSON.FeatureCollection = await res.json();

    const parsedProps = resJson.features.map(feature => {
      // Get fields from layer configuration.
      const [layerId] = (feature?.id as string).split('.');

      const featureInfoProps =
        layers?.find(l => l.serverLayerName === layerId)?.featureInfoProps ||
        {};

      const searchProps = Object.keys(featureInfoProps);

      const properties = feature.properties ?? {};

      return Object.keys(properties)
        .filter(k => searchProps.includes(k))
        .reduce(
          (obj, key) => ({
            ...obj,
            [featureInfoProps[key].dataTitle]: formatFeatureInfo(
              properties[key],
              featureInfoProps[key].type,
            ),
          }),
          {},
        );
    });

    return parsedProps.reduce((obj, item) => ({ ...obj, ...item }), {});
  } catch (error) {
    return {};
  }
};

/**
 * This function builds and runs the getFeatureInfo request given the parameters
 *
 * @return Promise with returned object from request
 */
function fetchFeatureInfo(
  layers: WMSLayerProps[],
  url: string,
  params: FeatureInfoType,
  dispatch: Dispatch,
): Promise<{ [name: string]: string }> {
  const requestLayers = layers.filter(l => l.baseUrl === url);
  const layerNames = requestLayers.map(l => l.serverLayerName).join(',');

  const requestParams = {
    service: 'WMS',
    request: 'getFeatureInfo',
    version: '1.1.1',
    exceptions: 'application/json',
    infoFormat: 'application/json',
    layers: layerNames,
    srs: 'EPSG:4326',
    queryLayers: layerNames,
    featureCount: 1,
    format: 'image/png',
    styles: '',
  };

  const wmsParams: RequestFeatureInfo = { ...params, ...requestParams };

  return runFeatureInfoRequest(url, wmsParams, layers, dispatch);
}

/**
 * Collects all urls to create a getFeatureInfo request.
 *
 * @return Promise with returned object from request
 */
export async function makeFeatureInfoRequest(
  layers: WMSLayerProps[],
  params: FeatureInfoType,
  dispatch: Dispatch,
): Promise<{ [name: string]: string } | null> {
  const urls = [...new Set(layers.map(l => l.baseUrl))];

  const requests = urls.map(url =>
    fetchFeatureInfo(layers, url, params, dispatch),
  );

  return Promise.all(requests)
    .then(r => r.reduce((obj, item) => ({ ...obj, ...item }), {}))
    .then(obj => (Object.keys(obj).length === 0 ? null : obj));
}

export async function fetchWMSLayerAsGeoJSON(options: {
  lyr: WMSLayerProps;
  startDate?: number;
  endDate?: number;
}): Promise<GeoJSON.FeatureCollection> {
  try {
    const { lyr, startDate, endDate } = options;

    if (lyr.type !== 'wms') {
      throw Error(
        `Unexpected layer type. Expected: "wms". Actual: "${lyr.type}"`,
      );
    }

    const wfsServerURL = `${lyr.baseUrl}/wfs`;

    const wfs = new WFS(wfsServerURL);

    const wfsLayer = await wfs.getLayer(lyr.serverLayerName);

    return await wfsLayer.getFeatures({
      count: 100000,
      dateRange: startDate && endDate ? [startDate, endDate] : undefined,
      method: 'GET',
    });
  } catch (error) {
    console.error(error);
    return { type: 'FeatureCollection', features: [] };
  }
}
