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
  CoverageEndDateTimestamp,
  CoverageStartDateTimestamp,
  CoverageWindow,
  DisplayDateTimestamp,
  LayerKey,
  LayerType,
  PointDataLayerProps,
  QueryDateTimestamp,
  ReferenceDateTimestamp,
  RequestFeatureInfo,
  SeasonBounds,
  SelectedDateTimestamp,
  Validity,
  ValidityEndDateTimestamp,
  ValidityPeriod,
  ValidityStartDateTimestamp,
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
 * Get the DateItem to use for querying the backend from the selected date
 * Optionally default to the most recent date available if no good match
 *
 * @return DateItem | undefined
 */
export const getRequestDateItem = (
  layerAvailableDates: DateItem[] | undefined,
  selectedDate?: SelectedDateTimestamp,
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
 * Get the correct date used to make the request. If available dates is undefined. Return selectedDate as default.
 *
 * @return unix timestamp
 */
export const getRequestDate = (
  layerAvailableDates: DateItem[] | undefined,
  selectedDate?: SelectedDateTimestamp,
  defaultToMostRecent = true,
): QueryDateTimestamp | undefined => {
  const dateItem = getRequestDateItem(
    layerAvailableDates,
    selectedDate,
    defaultToMostRecent,
  );

  if (!dateItem) {
    return selectedDate as unknown as QueryDateTimestamp;
  }

  return dateItem.queryDate;
};

/** Coverage information for a single layer */
export interface LayerDateCoverage {
  layerId: string;
  layerTitle: string;
  startDate?: number;
  endDate?: number;
}

/**
 * Compute date coverage for layers that support dates.
 * Returns an array of coverage info for each layer that has coverage data.
 *
 * @param layersWithDateSupport - Layers with dateItems attached
 * @param selectedDate - The currently selected date
 * @returns Array of layer coverage information
 */
export function getLayersCoverage(
  layersWithDateSupport: Array<{
    id: string;
    title?: string;
    dateItems: DateItem[];
  }>,
  selectedDate: SelectedDateTimestamp | null | undefined,
): LayerDateCoverage[] {
  if (!selectedDate) {
    return [];
  }

  return layersWithDateSupport
    .map((layer): LayerDateCoverage | null => {
      const dateItem = getRequestDateItem(layer.dateItems, selectedDate);
      if (dateItem?.startDate || dateItem?.endDate) {
        return {
          layerId: layer.id,
          layerTitle: layer.title || layer.id,
          startDate: dateItem.startDate,
          endDate: dateItem.endDate,
        };
      }
      return null;
    })
    .filter((item): item is LayerDateCoverage => item !== null);
}

/**
 * Convert layer coverage array to a map keyed by layer ID.
 * Useful for quick lookups when rendering legend items.
 */
export function getLayersCoverageMap(
  layersWithDateSupport: Array<{
    id: string;
    title?: string;
    dateItems: DateItem[];
  }>,
  selectedDate: SelectedDateTimestamp | null | undefined,
): Record<string, { startDate?: number; endDate?: number }> {
  const coverageArray = getLayersCoverage(layersWithDateSupport, selectedDate);
  return coverageArray.reduce(
    (map, coverage) => {
      map[coverage.layerId] = {
        startDate: coverage.startDate,
        endDate: coverage.endDate,
      };
      return map;
    },
    {} as Record<string, { startDate?: number; endDate?: number }>,
  );
}

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
      return [layer.id, ...(fallbackLayerKeys || [])]
        .reduce((acc: DateItem[], key) => {
          if (serverAvailableDates[key]) {
            return [...acc, ...serverAvailableDates[key]];
          }
          return acc;
        }, [])
        .sort((a, b) => a.displayDate - b.displayDate);
    case 'impact':
      return serverAvailableDates[
        (LayerDefinitions[layer.hazardLayer] as WMSLayerProps).id
      ];
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
): Promise<ReferenceDateTimestamp[]> => {
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

  const data = await (pointDataFetchPromises[fetchUrlWithParams] =
    pointDataFetchPromises[fetchUrlWithParams] ||
    loadPointLayerDataFromURL(fetchUrlWithParams, id, dispatch, fallbackUrl));

  return (
    data
      // adding 12 hours to avoid  errors due to daylight saving, and convert to number
      .map(item => new Date(item.date).setUTCHours(12, 0, 0, 0))
      // remove duplicate dates - indexOf returns first index of item
      .filter(
        (date, index, arr) => arr.indexOf(date) === index,
      ) as ReferenceDateTimestamp[]
  );
};

export const getAdminLevelDataCoverage = (layer: AdminLevelDataLayerProps) => {
  const { dates } = layer;
  if (!dates) {
    return [];
  }
  // raw data comes in as {"dates": ["YYYY-MM-DD"]}
  return dates.map(v => new Date(v).getTime() as ReferenceDateTimestamp);
};

export const getStaticRasterDataCoverage = (layer: StaticRasterLayerProps) => {
  const { dates } = layer;
  if (!dates) {
    return [];
  }
  // raw data comes in as {"dates": ["YYYY-MM-DD"]}
  return dates.map(v => new Date(v).getTime() as ReferenceDateTimestamp);
};

/**
 * Creates DateItem object whose fields have the same value.
 *
 * @return DateItem
 */
const generateDefaultDateItem = (date: number, baseItem?: Object): DateItem => {
  const newDate = new Date(date).setUTCHours(12, 0, 0, 0);
  const r = {
    displayDate: newDate as DisplayDateTimestamp,
    queryDate: newDate as QueryDateTimestamp,
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

/**
 * Returns the start and end date for the given reference date
 * and Validity or CoverageWindow. Do not use this function
 * directly, instead use one of the strongly typed ones below.
 */
function getStartAndEndDateFromValidityOrCoverageDefinition(
  date: ReferenceDateTimestamp,
  definition: CoverageWindow | Validity,
): {
  startDate: number;
  endDate: number;
} {
  const { mode, backward, forward, seasons } = definition;
  const startDate = new Date(date);
  const endDate = new Date(date);

  if (mode === DatesPropagation.DAYS) {
    // If mode is "days", adjust dates directly based on the duration
    startDate.setDate(startDate.getDate() - (backward || 0));
    endDate.setDate(endDate.getDate() + (forward || 0));
    // For "dekad" mode, calculate start and end dates based on backward and forward dekads
    // Dekads are 10-day periods, so we adjust dates accordingly
  } else if (mode === DatesPropagation.DEKAD) {
    const DekadStartingDays = [1, 11, 21];
    const startDayOfTheDekad = startDate.getDate();
    if (!DekadStartingDays.includes(startDayOfTheDekad)) {
      throw Error(
        'publishing day for dekad layers is expected to be 1, 11, 21.',
      );
    }
    // find the index so that we can use a modulo to find the new dekad start and end date.
    const dekadStartIndex = DekadStartingDays.findIndex(
      x => x === startDayOfTheDekad,
    );

    if (forward) {
      const newDekadEndIndex = (dekadStartIndex + forward) % 3;
      const nMonthsForward = Math.floor((dekadStartIndex + forward) / 3);
      endDate.setDate(DekadStartingDays[newDekadEndIndex]);
      endDate.setMonth(endDate.getMonth() + nMonthsForward);
      endDate.setDate(endDate.getDate() - 1);
    }
    if (backward) {
      const newDekadStartIndex: number = (dekadStartIndex - backward + 3) % 3;
      const nMonthsBackward = Math.floor((dekadStartIndex - backward) / 3);
      startDate.setDate(DekadStartingDays.at(newDekadStartIndex)!);
      startDate.setMonth(startDate.getMonth() + nMonthsBackward);
    }
  } else if (mode === DatesPropagation.SEASON) {
    if (seasons) {
      const seasonBounds = getSeasonBounds(startDate, seasons);
      if (seasonBounds) {
        startDate.setTime(seasonBounds.start.getTime());
        endDate.setTime(seasonBounds.end.getTime());
      } else {
        console.warn(`No season found for date: ${startDate.toISOString()}`);
        throw Error('No season found');
      }
    } else {
      const { start, end } = getSeasonBounds(startDate) as SeasonBounds;
      startDate.setTime(start.getTime());
      endDate.setTime(end.getTime() - oneDayInMs);
    }
  } else {
    throw Error(`Invalid coverage window mode: ${mode}`);
  }

  return { startDate: startDate.getTime(), endDate: endDate.getTime() };
}

function getStartAndEndDateFromValidity(
  date: ReferenceDateTimestamp,
  definition: Validity,
): {
  validityStart: ValidityStartDateTimestamp;
  validityEnd: ValidityEndDateTimestamp;
} {
  const r = getStartAndEndDateFromValidityOrCoverageDefinition(
    date,
    definition,
  );
  return {
    validityStart: r.startDate as ValidityStartDateTimestamp,
    validityEnd: r.endDate as ValidityEndDateTimestamp,
  };
}

function getStartAndEndDateFromCoverage(
  date: ReferenceDateTimestamp,
  definition: CoverageWindow,
): {
  coverageStart: CoverageStartDateTimestamp;
  coverageEnd: CoverageEndDateTimestamp;
} {
  const r = getStartAndEndDateFromValidityOrCoverageDefinition(
    date,
    definition,
  );
  return {
    coverageStart: r.startDate as CoverageStartDateTimestamp,
    coverageEnd: r.endDate as CoverageEndDateTimestamp,
  };
}

export function generateIntermediateDateItemFromValidity(
  dates: ReferenceDateTimestamp[], // reference dates
  validity: Validity,
  coverageWindow?: CoverageWindow,
): DateItem[] {
  const sortedDates = [...dates].sort((a, b) => a - b);

  // only calculate validity and coverage for dates that are less than 5 years old
  const EXTENDED_VALIDITY_YEARS = 5;
  const fiveYearsInMs = EXTENDED_VALIDITY_YEARS * 365 * oneDayInMs;
  const earliestDate = Date.now() - fiveYearsInMs;

  const dateItems = sortedDates
    .map(d => {
      const date = new Date(d);
      date.setUTCHours(12, 0, 0, 0);
      return date; // like a QueryDate, but in Date format iso number format
    })
    .reduce((acc: DateItem[], date: Date) => {
      // caching this value seems to reduce memory use substantially
      const dateGetTime = date.getTime();

      // only calculate validity/coverage for dates that are less than 5 years old
      if (dateGetTime < earliestDate) {
        return [
          ...acc,
          {
            displayDate: dateGetTime as DisplayDateTimestamp,
            queryDate: dateGetTime as QueryDateTimestamp,
            startDate: dateGetTime as CoverageStartDateTimestamp,
            endDate: dateGetTime as CoverageEndDateTimestamp,
          },
        ] as DateItem[];
      }

      // We create the coverage start and the end date for every date
      const { coverageStart, coverageEnd } = getStartAndEndDateFromCoverage(
        dateGetTime as ReferenceDateTimestamp,
        // if no coverage is defined for the layer, we use its validity instead
        coverageWindow || validity,
      );

      // Determine the start and end of the validity period
      let validityStart;
      let validityEnd;
      try {
        ({ validityStart, validityEnd } = getStartAndEndDateFromValidity(
          dateGetTime as ReferenceDateTimestamp,
          validity,
        ));
      } catch (e) {
        if (e instanceof Error && e.message === 'No season found') {
          return [];
        }
        throw e;
      }
      // We create an array with the diff between the endDate and startDate and we create an array with the addition of the days in the startDate
      const daysToAdd: number[] = generateDatesRange(
        new Date(validityStart),
        new Date(validityEnd),
      );

      // convert the available days for a specific day to the DefaultDate format
      const dateItemsToAdd: DateItem[] = daysToAdd.map(dateToAdd => ({
        displayDate: dateToAdd as DisplayDateTimestamp,
        queryDate:
          validity.mode === DatesPropagation.SEASON
            ? (validityStart as unknown as QueryDateTimestamp)
            : (dateGetTime as QueryDateTimestamp),
        startDate: coverageStart,
        endDate: coverageEnd,
      }));

      return [...acc, ...dateItemsToAdd];
    }, []);

  // We sort the defaultDateItems and the dateItems and we order by displayDate to filter the duplicates
  // or the overlapping dates

  return dateItems.sort((a, b) => {
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
): Promise<{ [layerId: LayerKey]: number[] }> => {
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
): Promise<{ [layerId: LayerKey]: number[] }> => {
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
): Record<LayerKey, ReferenceDateTimestamp[]> =>
  layers.reduce((acc: Record<string, ReferenceDateTimestamp[]>, layer) => {
    const serverLayerName =
      layer.type === 'composite'
        ? (LayerDefinitions[layer.dateLayer] as WMSLayerProps).serverLayerName
        : layer.serverLayerName;
    const layerDates = serverDates[serverLayerName] as ReferenceDateTimestamp[];
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

        acc[layer.id as string] = availableDates.length
          ? availableDates
          : [layerDates[layerDates.length - 1]];
      } else {
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
): Promise<Record<string, ReferenceDateTimestamp[]>> {
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
): Promise<Record<string, ReferenceDateTimestamp[]>> {
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
    } catch (_error) {
      cachedPreprocessedDates = {};
    }
  }

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
 * @return a Promise of Map<LayerID (not always id from LayerProps but can be), DateItem[]>
 */
export async function getAvailableDatesForLayer(
  getState: () => RootState,
  layerId: LayerKey,
): Promise<AvailableDates> {
  const LayerDefinition = LayerDefinitions[layerId];

  // At this point, all network data should have been preloaded in
  // the redux state, so we just need to process it into the right
  // format for the layer that's being activated
  const getPreloadedLayerDates = (lId: string): ReferenceDateTimestamp[] => {
    const layer = LayerDefinitions[lId];
    const state = getState();

    switch (getLayerType(layer)) {
      case 'WMSLayer':
        return state.serverPreloadState.WMSLayerDates[layer.id];
      case 'pointDataLayer':
        return state.serverPreloadState.pointDataLayerDates[layer.id];
      case 'adminWithDataLayer':
        return getAdminLevelDataCoverage(layer as AdminLevelDataLayerProps);
      case 'staticRasterLayer':
        return getStaticRasterDataCoverage(layer as StaticRasterLayerProps);
      default:
        console.warn(
          `Layer ${lId} has unhandled layer type ${getLayerType(layer)}`,
        );
        return [];
    }
  };

  // the list of available reference dates from the server
  const layerAvailableDates = getPreloadedLayerDates(layerId) || [];

  // Generate dates for layers with validity and no path
  if (LayerDefinition.validity !== undefined) {
    return {
      [LayerDefinition.id]: generateIntermediateDateItemFromValidity(
        layerAvailableDates,
        LayerDefinition.validity,
        LayerDefinition.coverageWindow,
      ),
    };
  }

  // Generate dates for layers with path
  if ((LayerDefinition as AdminLevelDataLayerProps).validityPeriod) {
    // Use preprocessed dates for layers with dates path
    const preprocessedDates = countriesWithPreprocessedDates.includes(
      safeCountry,
    )
      ? await fetchPreprocessedDates()
      : {};

    if (layerId in preprocessedDates) {
      return {
        [layerId]: generateDateItemsRange(preprocessedDates[layerId]),
      };
    }
    return {
      [layerId]: await generateIntermediateDateItemFromDataFile(
        layerAvailableDates,
        (LayerDefinition as AdminLevelDataLayerProps).path,
        (LayerDefinition as AdminLevelDataLayerProps).validityPeriod!,
      ),
    };
  }

  // Generate dates for layers with validity but not an admin_level_data type
  return {
    [layerId]: layerAvailableDates.map((d: number) =>
      generateDefaultDateItem(new Date(d).setUTCHours(12, 0, 0, 0)),
    ),
  };
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
  } catch (_error) {
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
  return Object.values(AAAvailableDates)
    .filter(Boolean) // Filter out undefined or null values
    .flat()
    .sort((a, b) => a.displayDate - b.displayDate);
}
