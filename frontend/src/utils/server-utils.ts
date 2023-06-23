import moment from 'moment';
import { get, merge, snakeCase, sortBy, sortedUniqBy } from 'lodash';
import { fetchCoverageLayerDays, formatUrl, WFS, WMS } from 'prism-common';
import { Dispatch } from 'redux';
import { appConfig } from '../config';
import { LayerDefinitions } from '../config/utils';
import type {
  AvailableDates,
  DateItem,
  PointDataLayerProps,
  RequestFeatureInfo,
  Validity,
  ValidityLayer,
} from '../config/types';
import {
  AdminLevelDataLayerProps,
  DataType,
  DatesPropagation,
  FeatureInfoType,
  ImpactLayerProps,
  PointDataLoader,
  StaticRasterLayerProps,
  WMSLayerProps,
} from '../config/types';
import { queryParamsToString } from './url-utils';
import { createEWSDatesArray } from './ews-utils';
import { fetchACLEDDates } from './acled-utils';
import { fetchWithTimeout } from './fetch-with-timeout';
import { LocalError } from './error-utils';
import { addNotification } from '../context/notificationStateSlice';
import { datesAreEqualWithoutTime } from './date-utils';

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
const createDefaultDateItem = (date: number, validity?: Validity): DateItem => {
  const dateWithTz = moment(date).set({ hour: 12, minute: 0 }).valueOf();
  const dateItemToReturn = {
    displayDate: dateWithTz,
    queryDate: dateWithTz,
  };
  if (validity) {
    const { mode } = validity;
    return {
      ...dateItemToReturn,
      isStartDate:
        mode === DatesPropagation.FORWARD || mode === DatesPropagation.BOTH,
      isEndDate:
        mode === DatesPropagation.BACKWARD || mode === DatesPropagation.BOTH,
    };
  }
  return {
    ...dateItemToReturn,
  };
};

/**
 * Create new array including dates specified within the validity parameter.
 *
 * @return Array of integers which represents a given date.
 */
const updateLayerDatesWithValidity = (layer: ValidityLayer): DateItem[] => {
  const { dates, validity } = layer;

  const { days, mode } = validity;

  // Convert the dates to moment dates
  const momentDates = Array.prototype.sort
    .call(dates)
    .map(d => moment(d).set({ hour: 12, minute: 0 }));

  // Generate first DateItem[] from dates array.
  const dateItemsDefault: DateItem[] = momentDates.map(momentDate =>
    createDefaultDateItem(momentDate.valueOf(), validity),
  );

  const dateItemsWithValidity = momentDates.reduce(
    (acc: DateItem[], momentDate) => {
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
      const daysToAdd = Array.from(
        { length: endDate.diff(startDate, 'days') + 1 },
        (_, index) => startDate.clone().add(index, 'days').valueOf(),
      );

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
    },
    [],
  );

  // We sort the defaultDateItems and the dateItemsWithValidity and we order by displayDate to filter the duplicates
  // or the overlapping dates
  return sortedUniqBy(
    sortBy([...dateItemsDefault, ...dateItemsWithValidity], 'displayDate'),
    'displayDate',
  );
};

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
    if (error.name === 'AbortError') {
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
    if (error.name === 'AbortError') {
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

  return Object.entries(mergedLayers).reduce((acc, [layerKey, dates]) => {
    const layerWithValidity = layersWithValidity.find(
      validityLayer => validityLayer.name === layerKey,
    );

    const updatedDates = layerWithValidity
      ? updateLayerDatesWithValidity(layerWithValidity)
      : dates.map((d: number) => createDefaultDateItem(d));

    return { ...acc, [layerKey]: updatedDates };
  }, {});
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
