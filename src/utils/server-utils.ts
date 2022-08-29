import moment from 'moment';
import { xml2js } from 'xml-js';
import { get, isEmpty, isString, merge, union, snakeCase } from 'lodash';
import { appConfig } from '../config';
import { LayerDefinitions } from '../config/utils';
import type {
  AvailableDates,
  PointDataLayerProps,
  RequestFeatureInfo,
  ValidityLayer,
  DateItem,
} from '../config/types';
import {
  ImpactLayerProps,
  WMSLayerProps,
  FeatureInfoType,
  LabelType,
  PointDataLoader,
} from '../config/types';
import { queryParamsToString } from '../context/layers/point_data';
import { DEFAULT_DATE_FORMAT } from './name-utils';
import { createEWSDatesArray } from './ews-utils';

// Note: PRISM's date picker is designed to work with dates in the UTC timezone
// Therefore, ambiguous dates (dates passed as string e.g 2020-08-01) shouldn't be calculated from the user's timezone and instead be converted directly to UTC. Possibly with moment.utc(string)

const xml2jsOptions = {
  compact: true,
  trim: true,
  ignoreComment: true,
};
export type DateCompatibleLayer =
  | WMSLayerProps
  | ImpactLayerProps
  | PointDataLayerProps;
export const getPossibleDatesForLayer = (
  layer: DateCompatibleLayer,
  serverAvailableDates: AvailableDates,
  // eslint-disable-next-line consistent-return
): number[] => {
  // eslint-disable-next-line default-case
  const datesArray = () => {
    switch (layer.type) {
      case 'wms':
        return serverAvailableDates[layer.serverLayerName];
      case 'impact':
        return serverAvailableDates[
          (LayerDefinitions[layer.hazardLayer] as WMSLayerProps).serverLayerName
        ];
      case 'point_data':
        return serverAvailableDates[layer.id];
      default:
        return [];
    }
  };

  return datesArray().map(d => d.displayDate);
};

export function formatUrl(
  baseUrl: string,
  params: { [key: string]: any } = {},
): string {
  const url = new URL(baseUrl);
  Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
  return url.toString();
}

/**
 * Format the raw data to { [layerId]: availableDates }
 * @param rawLayers Layers data return by the server 'GetCapabilities' request
 * @param layerIdPath path to layer's id
 * @param datesPath path to layer's available dates
 * @returns an object shape like { [layerId]: availableDates }
 */
function formatCapabilitiesInfo(
  rawLayers: any,
  layerIdPath: string,
  datesPath: string,
) {
  return rawLayers.reduce((acc: any, layer: any) => {
    const layerId = get(layer, layerIdPath);
    const rawDates = get(layer, datesPath, []);

    const dates: (string | { _text: string })[] = isString(rawDates)
      ? rawDates.split(',')
      : rawDates;

    const availableDates = dates
      .filter(date => !isEmpty(date))
      .map(date =>
        // adding 12 hours to avoid  errors due to daylight saving
        moment
          .utc(get(date, '_text', date).split('T')[0])
          .set({ hour: 12 })
          .valueOf(),
      );

    const { [layerId]: oldLayerDates } = acc;
    return {
      ...acc,
      [layerId]: union(availableDates, oldLayerDates),
    };
  }, {});
}

type FlatLayer = {
  Name: {
    _text: string;
    [key: string]: any;
  };
  Dimension: {
    _text: string;
    [key: string]: any;
  };
  [key: string]: any;
};

type FlatLayerContainer = { Layer: FlatLayer; [key: string]: any };
type LayerContainer =
  | { Layer: LayerContainer; [key: string]: any }
  | FlatLayerContainer[]
  | FlatLayer[];

const isArrayOfFlatLayerContainers = (
  maybeArray: LayerContainer,
): maybeArray is FlatLayerContainer[] => {
  return (maybeArray as FlatLayerContainer[])[0].Layer !== undefined;
};

function flattenLayers(rawLayers: LayerContainer): FlatLayer[] {
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
    return [];
  }
  if (isArrayOfFlatLayerContainers(rawLayers)) {
    return rawLayers.reduce((acc, { Layer }) => {
      if ('Layer' in Layer) {
        return acc.concat(
          ...flattenLayers((Layer.Layer as unknown) as LayerContainer),
        );
      }
      if (Array.isArray(Layer)) {
        return acc.concat(...flattenLayers(Layer));
      }
      return acc.concat(Layer);
    }, [] as FlatLayer[]);
  }
  return rawLayers as FlatLayer[];
}

export function formatWMSLegendUrl(baseUrl: string, serverLayerName: string) {
  const legendOptions = {
    fontAntiAliasing: true,
    fontSize: 13,
    fontName: 'Roboto Light',
    forceLabels: 'on',
    fontColor: '0x2D3436',
  };

  const requestParams = {
    service: 'WMS',
    request: 'GetLegendGraphic',
    format: 'image/png',
    layer: serverLayerName,
    legend_options: Object.entries(legendOptions)
      .map(([key, value]) => `${key}:${value}`)
      .join(';'),
  };

  return formatUrl(`${baseUrl}/ows`, requestParams);
}

/**
 * List capabilities for a WMS layer.
 * @param serverUri
 */
async function getWMSCapabilities(serverUri: string) {
  const requestUri = formatUrl(serverUri, { request: 'GetCapabilities' });

  try {
    const response = await fetch(requestUri);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    const responseText = await response.text();
    const responseJS = xml2js(responseText, xml2jsOptions);

    const rawLayers = get(responseJS, 'WMS_Capabilities.Capability.Layer');

    const flatLayers = flattenLayers(
      Array.isArray(rawLayers) ? rawLayers : [rawLayers],
    );

    return formatCapabilitiesInfo(flatLayers, 'Name._text', 'Dimension._text');
  } catch (error) {
    // TODO we used to throw the error here so a notification appears. Removed because a failure of one shouldn't prevent the successful requests from saving.
    console.error(error);
    return {};
  }
}

/**
 * List capabilities for a WCS layer.
 * @param serverUri
 */
async function getWCSCoverage(serverUri: string) {
  const requestUri = formatUrl(serverUri, {
    request: 'DescribeCoverage',
  });

  try {
    const response = await fetch(requestUri);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    const responseText = await response.text();
    const responseJS = xml2js(responseText, xml2jsOptions);

    const rawLayers = get(responseJS, 'CoverageDescription.CoverageOffering');

    return formatCapabilitiesInfo(
      rawLayers,
      'name._text',
      'domainSet.temporalDomain.gml:timePosition',
    );
  } catch (error) {
    // TODO we used to throw the error here so a notification appears via middleware. Removed because a failure of one shouldn't prevent the successful requests from saving.
    // we could do a dispatch for a notification, but getting a dispatch reference here would be complex, just for a notification
    console.error(error);
    return {};
  }
}

type PointDataDates = Array<{
  date: string;
}>;
// used to cache repeat date requests to same URL
const pointDataFetchPromises: {
  [k in PointDataLayerProps['dateUrl']]: Promise<PointDataDates>;
} = {};

/**
 * Gets the available dates for a point data layer.
 */
async function getPointDataCoverage(layer: PointDataLayerProps) {
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

  const loadPointLayerDataFromURL = async (fetchUrl: string) => {
    if (!fetchUrl) {
      return [];
    }
    const response = await fetch(fetchUrl);
    if (response.status !== 200) {
      console.error(`Impossible to get point data dates for ${layer.id}`);
      return [];
    }
    return (await response.json()) as PointDataDates;
  };

  switch (loader) {
    case PointDataLoader.EWS:
      return createEWSDatesArray();
    default:
      break;
  }

  // eslint-disable-next-line fp/no-mutation
  const data = await (pointDataFetchPromises[fetchUrlWithParams] =
    pointDataFetchPromises[fetchUrlWithParams] ||
    loadPointLayerDataFromURL(fetchUrlWithParams)).catch(err => {
    console.error(err);
    console.warn(
      `Failed loading point data layer: ${id}. Attempting to load fallback URL...`,
    );
    return loadPointLayerDataFromURL(fallbackUrl || '');
  });

  const possibleDates = data
    // adding 12 hours to avoid  errors due to daylight saving, and convert to number
    .map(item => moment.utc(item.date).set({ hour: 12 }).valueOf())
    // remove duplicate dates - indexOf returns first index of item
    .filter((date, index, arr) => {
      return arr.indexOf(date) === index;
    });

  return possibleDates;
}

/**
 * Create new array including dates specified within the validity parameter.
 *
 * @return Array of integers which represents a given date.
 */
const updateLayerDatesWithValidity = (layer: ValidityLayer): DateItem[] => {
  const { dates, validity } = layer;

  const datesWithValidity = dates.map((date: number) => {
    const momentDate = moment(date).set({ hour: 12 });

    const endDate = momentDate.clone().add(validity, 'days');
    const startDate = momentDate.clone().subtract(validity, 'days');

    const daysToAdd = [...Array(endDate.diff(startDate, 'days') + 1).keys()];

    const days: number[] = daysToAdd.map(day =>
      startDate.clone().add(day, 'days').valueOf(),
    );

    return days.map(day => ({ displayDate: day, queryDate: date }));
  });

  const flattenDates = [...new Set(datesWithValidity.flat())];

  return flattenDates;
};

/**
 * Load available dates for WMS and WCS using a serverUri defined in prism.json and for GeoJSONs (point data) using their API endpoint.
 *
 * @return a Promise of Map<LayerID (not always id from LayerProps but can be), availableDates[]>
 */
export async function getLayersAvailableDates(): Promise<AvailableDates> {
  const wmsServerUrls: string[] = get(appConfig, 'serversUrls.wms', []);
  const wcsServerUrls: string[] = get(appConfig, 'serversUrls.wcs', []);

  const pointDataLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is PointDataLayerProps => layer.type === 'point_data',
  );

  const layerDates = await Promise.all([
    ...wmsServerUrls.map(url => getWMSCapabilities(url)),
    ...wcsServerUrls.map(url => getWCSCoverage(url)),
    ...pointDataLayers.map(async layer => ({
      [layer.id]: await getPointDataCoverage(layer),
    })),
  ]);

  // Merge all layer types results into a single dictionary of date arrays.
  const mergedLayers: { [key: string]: number[] } = merge({}, ...layerDates);

  const wmsLayersWithValidity: ValidityLayer[] = Object.values(LayerDefinitions)
    .filter(
      (layer): layer is WMSLayerProps =>
        layer.type === 'wms' && layer.validity !== undefined,
    )
    .map(layer => ({
      name: layer.serverLayerName,
      dates: mergedLayers[layer.serverLayerName],
      validity: layer.validity!,
    }));

  const mergedLayersWithUpdatedDates = Object.entries(mergedLayers).reduce(
    (acc, [layerKey, dates]) => {
      const layerWithValidity = wmsLayersWithValidity.find(
        validityLayer => validityLayer.name === layerKey,
      );

      const updatedDates = layerWithValidity
        ? updateLayerDatesWithValidity(layerWithValidity)
        : dates.map((d: number) => {
            const dateWithTz = moment(d).set({ hour: 12 }).valueOf();
            return {
              displayDate: dateWithTz,
              queryDate: dateWithTz,
            };
          });

      return { ...acc, [layerKey]: updatedDates };
    },
    {},
  );

  return mergedLayersWithUpdatedDates;
}

/**
 * Format value from featureInfo response based on LabelType provided
 *
 * @return a formatted string
 */
export function formatFeatureInfo(value: string, type: LabelType): string {
  if (type === LabelType.Date) {
    return `${moment(value).utc().format('MMMM Do YYYY, h:mm:ss')} UTC`;
  }

  return value;
}

/**
 * Executes a getFeatureInfo request
 *
 * @return object of key: string - value: string with formatted values given label type.
 */
async function runFeatureInfoRequest(
  url: string,
  wmsParams: RequestFeatureInfo,
  layers: WMSLayerProps[],
): Promise<{ [name: string]: string }> {
  // Transform to snake case.
  const wmsParamsInSnakeCase = Object.entries(wmsParams).reduce(
    (obj, item) => ({
      ...obj,
      [snakeCase(item[0])]: item[1],
    }),
    {},
  );

  const res = await fetch(formatUrl(`${url}/ows`, wmsParamsInSnakeCase));
  const resJson: GeoJSON.FeatureCollection = await res.json();

  const parsedProps = resJson.features.map(feature => {
    // Get fields from layer configuration.
    const [layerId] = (feature?.id as string).split('.');

    const featureInfoProps =
      layers?.find(l => l.serverLayerName === layerId)?.featureInfoProps || {};

    const searchProps = Object.keys(featureInfoProps);

    const properties = feature.properties ?? {};

    return Object.keys(properties)
      .filter(k => searchProps.includes(k))
      .reduce(
        (obj, key) => ({
          ...obj,
          [featureInfoProps[key].label]: formatFeatureInfo(
            properties[key],
            featureInfoProps[key].type,
          ),
        }),
        {},
      );
  });

  return parsedProps.reduce((obj, item) => ({ ...obj, ...item }), {});
}

/**
 * This function builds and runs the getFeatureInfo request given the parameters
 *
 * @return Promise with returned object from request
 */
function fetchFeatureInfo(
  layers: WMSLayerProps[],
  url: string,
  params: FeatureInfoType,
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

  return runFeatureInfoRequest(url, wmsParams, layers);
}

/**
 * Collects all urls to create a getFeatureInfo request.
 *
 * @return Promise with returned object from request
 */
export async function makeFeatureInfoRequest(
  layers: WMSLayerProps[],
  params: FeatureInfoType,
): Promise<{ [name: string]: string } | null> {
  const urls = [...new Set(layers.map(l => l.baseUrl))];

  const requests = urls.map(url => fetchFeatureInfo(layers, url, params));

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

    // to-do: add additionalQueryParams like srsName and bbox
    const requestParams = {
      service: 'WFS',
      request: 'GetFeature',
      outputFormat: 'application/json', // per https://docs.geoserver.org/latest/en/user/services/wfs/outputformats.html
      typeNames: lyr.serverLayerName, // per https://docs.geoserver.org/latest/en/user/services/wfs/reference.html
      cql_filter:
        startDate && endDate
          ? `timestamp BETWEEN ${moment(startDate).format(
              DEFAULT_DATE_FORMAT,
            )} AND ${moment(endDate).format(DEFAULT_DATE_FORMAT)}T23:59:59`
          : undefined,
    };

    const url = formatUrl(wfsServerURL, requestParams);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const featureCollection: GeoJSON.FeatureCollection = await response.json();

    return featureCollection;
  } catch (error) {
    console.error(error);
    return { type: 'FeatureCollection', features: [] };
  }
}
