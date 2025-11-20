import { oneDayInMs } from 'components/MapView/LeftPanel/utils';
import { get, snakeCase } from 'lodash';
import { WFS, WMS, fetchCoverageLayerDays, formatUrl } from 'prism-common';
import type { AppDispatch, RootState } from 'context/store';
import {
  appConfig,
  countriesWithPreprocessedDates,
  safeCountry,
} from '../config';
import type {
  AnticipatoryActionLayerProps,
  AvailableDates,
  CompositeLayerProps,
  LayerType,
  PathLayer,
  PointDataLayerProps,
  RequestFeatureInfo,
  SeasonBounds,
  Validity,
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

import { LayerDefinitions } from '../config/utils';
import { addNotification } from '../context/notificationStateSlice';
import { fetchACLEDDates } from './acled-utils';
import {
  StartEndDate,
  datesAreEqualWithoutTime,
  generateDateItemsRange,
  generateDatesRange,
  getFormattedDate,
  getSeasonBounds,
} from './date-utils';
import { LocalError } from './error-utils';
import { createEWSDatesArray } from './ews-utils';
import { fetchWithTimeout } from './fetch-with-timeout';
import { queryParamsToString } from './url-utils';

/**
 * Function that gets the correct date item.
 *
 * @return DateItem
 */
export const getRequestDateItem = (
  layerAvailableDates: DateItem[] | undefined,
  selectedDate?: number,
  defaultToMostRecent: boolean = true,
): DateItem | undefined => {
  if (!selectedDate) {
    return undefined;
  }

  if (!layerAvailableDates || layerAvailableDates.length === 0) {
    return undefined;
  }

  const dateItem = layerAvailableDates.find(date =>
    datesAreEqualWithoutTime(date.displayDate, selectedDate),
  );
  if (!dateItem && defaultToMostRecent) {
    return layerAvailableDates[layerAvailableDates.length - 1];
  }

  return dateItem;
};

/**
 * Function that gets the correct date used to make the request. If available dates is undefined. Return selectedDate as default.
 *
 * @return unix timestamp
 */
export const getRequestDate = (
  layerAvailableDates: DateItem[] | undefined,
  selectedDate?: number,
  defaultToMostRecent = true,
): number | undefined => {
  const dateItem = getRequestDateItem(
    layerAvailableDates,
    selectedDate,
    defaultToMostRecent,
  );

  if (!dateItem) {
    return selectedDate;
  }

  return dateItem.queryDate;
};

// Note: PRISM's date picker is designed to work with dates in the UTC timezone
// Therefore, ambiguous dates (dates passed as string e.g 2020-08-01) shouldn't be calculated from the user's timezone and instead be converted directly to UTC.
// plain JS Date `new Date('2020-08-01').toISOString()`, yields: '2020-08-01T00:00:00.000Z'.

export type DateCompatibleLayer =
  | AdminLevelDataLayerProps
  | WMSLayerProps
  | ImpactLayerProps
  | PointDataLayerProps
  | StaticRasterLayerProps
  | CompositeLayerProps
  | AnticipatoryActionLayerProps;

export const getPossibleDatesForLayer = (
  layer: DateCompatibleLayer,
  serverAvailableDates: AvailableDates,
  // eslint-disable-next-line consistent-return
): DateItem[] => {
  switch (layer.type) {
    case 'admin_level_data':
    case 'point_data':
    case 'static_raster':
    case 'wms':
      // get available dates for the layer and its fallback layers
      // eslint-disable-next-line no-case-declarations
      const { fallbackLayerKeys } = layer as AdminLevelDataLayerProps;
      if (!fallbackLayerKeys?.length) {
        return serverAvailableDates[layer.id] || [];
      }
      return (
        // eslint-disable-next-line fp/no-mutating-methods
        [layer.id, ...(fallbackLayerKeys || [])]
          .reduce((acc: DateItem[], key) => {
            if (serverAvailableDates[key]) {
              return [...acc, ...serverAvailableDates[key]];
            }
            return acc;
          }, [])
          .sort((a, b) => a.displayDate - b.displayDate)
      );
    case 'impact':
      // Fallback to the impact layer id in case the hazard layer
      // dates have not been stored yet.
      return (
        serverAvailableDates[
          (LayerDefinitions[layer.hazardLayer] as WMSLayerProps).id
        ] ||
        serverAvailableDates[layer.id] ||
        []
      );
    case 'composite': {
      // Filter dates that are after layer.startDate
      const startDateTimestamp = Date.parse(layer.startDate);
      const layerServerAvailableDates =
        serverAvailableDates[layer.id] ||
        serverAvailableDates[layer.dateLayer] ||
        [];
      return layerServerAvailableDates.filter(
        date => date.displayDate > startDateTimestamp,
      );
    }
    case 'anticipatory_action_drought':
    case 'anticipatory_action_storm':
    case 'anticipatory_action_flood':
      return serverAvailableDates[layer.id] || [];
    default:
      return [];
  }
};

type PointDataDates = Array<{
  date: string;
}>;
// used to cache repeat date requests to same URL
const pointDataFetchPromises: {
  [k in string]: Promise<PointDataDates>;
} = {};

const loadPointLayerDataFromURL = async (
  fetchUrl: string,
  layerId: string,
  dispatch: AppDispatch,
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
  dispatch: AppDispatch,
) => {
  const {
    dateUrl: url,
    fallbackData: fallbackUrl,
    id,
    additionalQueryParams,
    loader,
  } = layer;

  if (!url) {
    return [];
  }

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
      .map(item => new Date(item.date).setUTCHours(12, 0, 0, 0))
      // remove duplicate dates - indexOf returns first index of item
      .filter((date, index, arr) => arr.indexOf(date) === index)
  );
};

export const getAdminLevelDataCoverage = (layer: AdminLevelDataLayerProps) => {
  const { dates } = layer;
  if (!dates) {
    return [];
  }
  // raw data comes in as {"dates": ["YYYY-MM-DD"]}
  return dates.map(v => new Date(v).getTime());
};

export const getStaticRasterDataCoverage = (layer: StaticRasterLayerProps) => {
  const { dates } = layer;
  if (!dates) {
    return [];
  }
  // raw data comes in as {"dates": ["YYYY-MM-DD"]}
  return dates.map(v => new Date(v).getTime());
};

/**
 * Creates DateItem object whose fields have the same value.
 *
 * @return DateItem
 */
const generateDefaultDateItem = (date: number, baseItem?: Object): DateItem => {
  const newDate = new Date(date).setUTCHours(12, 0, 0, 0);
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
        return getFormattedDate(r, format as any) as string;
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
        startDate: new Date(startDate).setUTCHours(12, 0, 0, 0),
        endDate: new Date(endDate).setUTCHours(12, 0, 0, 0),
      };
    }),
  );

  const rangesWithoutMissing = ranges.filter(ra => ra.startDate && ra.endDate);
  return generateDateItemsRange(rangesWithoutMissing);
}

export function generateIntermediateDateItemFromValidity(
  dates: number[],
  validity: Validity,
) {
  const { forward, backward, mode } = validity;

  // eslint-disable-next-line fp/no-mutating-methods
  const sortedDates = [...dates].sort((a, b) => a - b);

  // only calculate validity for dates that are less than 5 years old
  const EXTENDED_VALIDITY_YEARS = 5;
  const fiveYearsInMs = EXTENDED_VALIDITY_YEARS * 365 * oneDayInMs;
  const earliestDate = Date.now() - fiveYearsInMs;

  const dateItemsWithValidity = sortedDates
    .map(d => {
      const date = new Date(d);
      date.setUTCHours(12, 0, 0, 0);
      return date;
    })
    .reduce((acc: DateItem[], date: Date) => {
      // caching this value seems to reduce memory use substantially
      const dateGetTime = date.getTime();

      // only calculate validity for dates that are less than 5 years old
      if (dateGetTime < earliestDate) {
        return [
          ...acc,
          {
            displayDate: dateGetTime,
            queryDate: dateGetTime,
            startDate: dateGetTime,
            endDate: dateGetTime,
          },
        ] as DateItem[];
      }

      // We create the start and the end date for every date
      const startDate = new Date(dateGetTime);
      const endDate = new Date(dateGetTime);

      if (mode === DatesPropagation.DAYS) {
        // If mode is "days", adjust dates directly based on the duration
        startDate.setDate(startDate.getDate() - (backward || 0));
        endDate.setDate(endDate.getDate() + (forward || 0));
        // For "dekad" mode, calculate start and end dates based on backward and forward dekads
        // Dekads are 10-day periods, so we adjust dates accordingly
      } else if (mode === DatesPropagation.DEKAD) {
        const DekadStartingDays = [1, 11, 21];
        const startDayOfTheMonth = startDate.getDate();
        if (!DekadStartingDays.includes(startDayOfTheMonth)) {
          throw Error(
            'publishing day for dekad layers is expected to be 1, 11, 21.',
          );
        }
        // find the index so that we can use a modulo to find the new dekad start and end date.
        const dekadStartIndex = DekadStartingDays.findIndex(
          x => x === startDayOfTheMonth,
        );

        if (forward) {
          const newDekadEndIndex = (dekadStartIndex + forward) % 3;
          const nMonthsForward = Math.floor((dekadStartIndex + forward) / 3);
          endDate.setDate(DekadStartingDays[newDekadEndIndex]);
          endDate.setMonth(endDate.getMonth() + nMonthsForward);
          endDate.setDate(endDate.getDate() - 1);
        }
        if (backward) {
          const newDekadStartIndex = (dekadStartIndex - backward + 3) % 3;
          const nMonthsBackward = Math.floor((dekadStartIndex - backward) / 3);
          startDate.setDate(DekadStartingDays[newDekadStartIndex]);
          startDate.setMonth(startDate.getMonth() + nMonthsBackward);
        }
      } else if (mode === DatesPropagation.SEASON) {
        if (validity.seasons) {
          const seasonBounds = getSeasonBounds(startDate, validity.seasons);
          if (seasonBounds) {
            startDate.setTime(seasonBounds.start.getTime());
            endDate.setTime(seasonBounds.end.getTime());
          } else {
            console.warn(
              `No season found for date: ${startDate.toISOString()}`,
            );
            return [];
          }
        } else {
          const { start, end } = getSeasonBounds(startDate) as SeasonBounds;
          startDate.setTime(start.getTime());
          endDate.setTime(end.getTime() - oneDayInMs);
        }
      } else {
        throw Error(`Invalid validity mode: ${mode}`);
      }

      // We create an array with the diff between the endDate and startDate and we create an array with the addition of the days in the startDate
      const daysToAdd = generateDatesRange(startDate, endDate);

      // convert the available days for a specific day to the DefaultDate format
      const dateItemsToAdd = daysToAdd.map(dateToAdd => ({
        displayDate: dateToAdd,
        queryDate:
          mode === DatesPropagation.SEASON
            ? startDate.getTime()
            : date.getTime(),
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
      }));

      return [...acc, ...dateItemsToAdd];
    }, []);

  // We sort the defaultDateItems and the dateItemsWithValidity and we order by displayDate to filter the duplicates
  // or the overlapping dates
  // eslint-disable-next-line fp/no-mutating-methods
  return dateItemsWithValidity.sort((a, b) => {
    if (a.displayDate < b.displayDate) {
      return -1;
    }
    return 1;
  });
}

/**
 * Wrapper function for utility fetchCoverageLayerDays from Common Library
 */
const localFetchCoverageLayerDays = async (
  url: string,
  dispatch: AppDispatch,
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
  dispatch: AppDispatch,
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

/**
 * Function to map server dates to layer IDs
 *
 * @param serverDates - The dates fetched from the server
 * @param layers - The layers to map the dates to
 * @return A record of layer IDs to dates
 */
const mapServerDatesToLayerIds = (
  serverDates: Record<string, number[]>,
  layers: (WMSLayerProps | CompositeLayerProps)[],
): Record<string, number[]> =>
  layers.reduce((acc: Record<string, number[]>, layer) => {
    const serverLayerName =
      layer.type === 'composite'
        ? (LayerDefinitions[layer.dateLayer] as WMSLayerProps).serverLayerName
        : layer.serverLayerName;
    const layerDates = serverDates[serverLayerName];
    if (layerDates) {
      // Filter WMS layers by startDate, used for forecast layers in particular.
      if (layer.startDate) {
        const limitStartDate =
          layer.startDate === 'today'
            ? new Date().setUTCHours(0, 0).valueOf()
            : new Date(layer.startDate).setUTCHours(0, 0).valueOf();
        const availableDates = layerDates.filter(
          date => date >= limitStartDate,
        );
        // If there are no dates after filtering, get the last data available
        // eslint-disable-next-line fp/no-mutation
        acc[layer.id as string] = availableDates.length
          ? availableDates
          : [layerDates[layerDates.length - 1]];
      } else {
        // eslint-disable-next-line fp/no-mutation
        acc[layer.id] = layerDates;
      }
    }
    return acc;
  }, {});

const compositeLayers = Object.values(LayerDefinitions).filter(
  (layer): layer is CompositeLayerProps => layer.type === 'composite',
);

const compositeLayersWithDateLayerTypeMap: {
  [key: string]: string;
} = compositeLayers.reduce(
  (acc, layer) => ({
    ...acc,
    [layer.id]: LayerDefinitions[layer.dateLayer].type,
  }),
  {},
);
/**
 * Preload some layer dates from various servers in the background
 * This is run once at app init time, and will store various arrays
 * of dates for later use when activating layers.
 * Network fetches are parallelized as much as possible so that each
 * layer data is available as early as possible.
 */
export async function preloadLayerDatesForWMS(
  dispatch: AppDispatch,
): Promise<Record<string, number[]>> {
  const wmsServerUrls: string[] = get(appConfig, 'serversUrls.wms', []);
  const wcsServerUrls: string[] = get(appConfig, 'serversUrls.wcs', []);

  const WCSWMSLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is WMSLayerProps =>
      layer.type === 'wms' ||
      compositeLayersWithDateLayerTypeMap[layer.id] === 'wms',
  );
  const allWMSDates = wmsServerUrls.map(async url => {
    const serverDates = await localWMSGetLayerDates(url, dispatch);
    return mapServerDatesToLayerIds(serverDates, WCSWMSLayers);
  });
  const allWCSDates = wcsServerUrls.map(async url => {
    const serverDates = await localFetchCoverageLayerDays(url, dispatch);
    return mapServerDatesToLayerIds(serverDates, WCSWMSLayers);
  });

  const r = await Promise.all([...allWMSDates, ...allWCSDates]);
  return r.reduce((acc, item) => ({ ...acc, ...item }), {});
}

export async function preloadLayerDatesForPointData(
  dispatch: AppDispatch,
): Promise<Record<string, number[]>> {
  const pointDataLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is PointDataLayerProps =>
      (layer.type === 'point_data' && Boolean(layer.dateUrl)) ||
      compositeLayersWithDateLayerTypeMap[layer.id] === 'point_data',
  );
  const r = await Promise.all([
    ...pointDataLayers.map(async layer => ({
      [layer.id]: await getPointDataCoverage(layer, dispatch),
    })),
  ]);
  return r.reduce((acc, item) => ({ ...acc, ...item }), {});
}

let cachedPreprocessedDates: Record<string, StartEndDate[]>;
/**
 * Load preprocessed date ranges if available
 * */
async function fetchPreprocessedDates(): Promise<
  Record<string, StartEndDate[]>
> {
  /* eslint-disable fp/no-mutation */
  if (cachedPreprocessedDates === undefined) {
    try {
      // preprocessed-layer-dates.json is generated using "yarn preprocess-layers"
      // which runs ./scripts/preprocess-layers.js - preprocessValidityPeriods
      const response = await fetch(
        `data/${safeCountry}/preprocessed-layer-dates.json`,
      );
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        cachedPreprocessedDates = {};
      }
      cachedPreprocessedDates = await response.json();
    } catch (error) {
      cachedPreprocessedDates = {};
    }
  }
  /* eslint-enable fp/no-mutation */
  return cachedPreprocessedDates;
}

export const getLayerType = (
  l: LayerType,
):
  | 'adminWithDataLayer'
  | 'pointDataLayer'
  | 'staticRasterLayer'
  | 'WMSLayer'
  | 'invalidType' => {
  if (
    (l.type === 'point_data' && Boolean(l.dateUrl)) ||
    (l.type === 'composite' &&
      LayerDefinitions[l.dateLayer].type === 'point_data')
  ) {
    return 'pointDataLayer';
  }
  if (
    (l.type === 'admin_level_data' && Boolean(l.dates)) ||
    (l.type === 'composite' &&
      LayerDefinitions[l.dateLayer].type === 'admin_level_data')
  ) {
    return 'adminWithDataLayer';
  }
  if (
    (l.type === 'static_raster' && Boolean(l.dates)) ||
    (l.type === 'composite' &&
      LayerDefinitions[l.dateLayer].type === 'static_raster')
  ) {
    return 'staticRasterLayer';
  }
  if (l.type === 'wms') {
    return 'WMSLayer';
  }
  return 'invalidType';
};

/**
 * Load available dates for WMS and WCS using a serverUri defined in prism.json and for GeoJSONs (point data) using their API endpoint.
 *
 * @return a Promise of Map<LayerID (not always id from LayerProps but can be), availableDates[]>
 */
export async function getAvailableDatesForLayer(
  getState: () => RootState,
  layerId: string,
): Promise<AvailableDates> {
  const layerDefinition = LayerDefinitions[layerId];
  const hazardLayerId =
    layerDefinition.type === 'impact' ? layerDefinition.hazardLayer : undefined;
  const hazardLayerDefinition = hazardLayerId
    ? LayerDefinitions[hazardLayerId]
    : undefined;
  const relevantLayerDefinitions = {
    [layerId]: layerDefinition,
    ...(hazardLayerDefinition
      ? { [hazardLayerId]: hazardLayerDefinition }
      : {}),
  };

  // At this point, all network data should have been preloaded in
  // the redux state, so we just need to process it into the right
  // format now for the layer that's being activated
  const getPreloadedLayerDates = (lId: string): Record<string, number[]> => {
    const layer = LayerDefinitions[lId];
    const state = getState();

    if (layer.type === 'impact') {
      const hazardLayerId = layer.hazardLayer;

      if (hazardLayerId === layer.id) {
        console.warn(
          `Layer ${layer.id} references itself as hazard layer. Unable to derive dates.`,
        );
        return { [layer.id]: [] };
      }

      const hazardLayerDates =
        getPreloadedLayerDates(hazardLayerId)[hazardLayerId] || [];
      return { [layer.id]: hazardLayerDates };
    }

    switch (getLayerType(layer)) {
      case 'WMSLayer':
        return {
          [layer.id]: state.serverPreloadState.WMSLayerDates[layer.id],
        };
      case 'pointDataLayer':
        return {
          [layer.id]: state.serverPreloadState.pointDataLayerDates[layer.id],
        };
      case 'adminWithDataLayer':
        return {
          [layer.id]: getAdminLevelDataCoverage(
            layer as AdminLevelDataLayerProps,
          ),
        };
      case 'staticRasterLayer':
        return {
          [layer.id]: getStaticRasterDataCoverage(
            layer as StaticRasterLayerProps,
          ),
        };
      default:
        console.warn(
          `Layer ${lId} has unhandled layer type ${getLayerType(layer)}`,
        );
        return { [lId]: [] };
    }
  };
  const layerDates = getPreloadedLayerDates(layerId);
  const hazardLayerDates = hazardLayerId
    ? getPreloadedLayerDates(hazardLayerId)
    : undefined;

  // Retrieve layers that have a validity object
  const layersWithValidity: ValidityLayer[] = Object.values(
    relevantLayerDefinitions,
  )
    .filter(layer => layer.validity !== undefined)
    .map(layer => {
      const lId = layer.id;

      return {
        name: lId,
        dates: layerDates[lId],
        validity: layer.validity!,
      };
    });

  // Retrieve layers that have validityPeriod
  const layersWithValidityStartEndDate: PathLayer[] = Object.values(
    relevantLayerDefinitions,
  )
    .filter(layer => !!(layer as AdminLevelDataLayerProps).validityPeriod)
    .map(layer => ({
      name: layer.id,
      dates: layerDates[layer.id],
      path: (layer as AdminLevelDataLayerProps).path,
      validityPeriod: (layer as AdminLevelDataLayerProps)
        .validityPeriod as ValidityPeriod,
    }));

  // Use preprocessed dates for layers with dates path
  const preprocessedDates = countriesWithPreprocessedDates.includes(safeCountry)
    ? await fetchPreprocessedDates()
    : {};

  // Generate and replace date items for layers with all intermediates dates
  const buildLayerDateItems = async (
    layerName: string,
    dateArray: number[],
  ) => {
    // Generate dates for layers with validity and no path
    const matchingValidityLayer = layersWithValidity.find(
      validityLayer => validityLayer.name === layerName,
    );

    if (matchingValidityLayer) {
      const r = {
        [layerName]: generateIntermediateDateItemFromValidity(
          matchingValidityLayer.dates,
          matchingValidityLayer.validity,
        ),
      };
      return r;
    }

    // Generate dates for layers with path
    const matchingPathLayer = layersWithValidityStartEndDate.find(
      validityLayer => validityLayer.name === layerName,
    );

    if (matchingPathLayer) {
      if (layerName in preprocessedDates) {
        return {
          [layerName]: generateDateItemsRange(preprocessedDates[layerName]),
        };
      }
      return {
        [layerName]: await generateIntermediateDateItemFromDataFile(
          matchingPathLayer.dates,
          matchingPathLayer.path,
          matchingPathLayer.validityPeriod,
        ),
      };
    }

    // Generate dates for layers with validity but not an admin_level_data type
    return {
      [layerName]: dateArray.map((d: number) =>
        generateDefaultDateItem(new Date(d).setUTCHours(12, 0, 0, 0)),
      ),
    };
  };

  const layerDateItemsForLayer = await buildLayerDateItems(
    layerId,
    layerDates[layerId] || [],
  );

  if (hazardLayerId) {
    const hazardDateArray =
      hazardLayerDates?.[hazardLayerId] || layerDates[hazardLayerId] || [];
    const hazardDateItems = await buildLayerDateItems(
      hazardLayerId,
      hazardDateArray,
    );
    return {
      ...hazardDateItems,
      ...layerDateItemsForLayer,
    };
  }

  return layerDateItemsForLayer;
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
    return getFormattedDate(value, 'locale') as string;
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
  dispatch: AppDispatch,
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
  dispatch: AppDispatch,
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
  dispatch: AppDispatch,
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

export function getAAAvailableDatesCombined(AAAvailableDates: AvailableDates) {
  // eslint-disable-next-line fp/no-mutation, fp/no-mutating-methods
  return Object.values(AAAvailableDates)
    .filter(Boolean) // Filter out undefined or null values
    .flat()
    .sort((a, b) => a.displayDate - b.displayDate);
}
