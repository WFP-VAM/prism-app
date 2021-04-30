import fetch from 'node-fetch';
import moment from 'moment';
import { xml2js } from 'xml-js';
import { get, isEmpty, isString, union } from 'lodash';
import { Extent, WCSRequestUrl } from './raster-utils';
import { AlertConfig } from '../entities/alerts.entity';

// eslint-disable-next-line fp/no-mutation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const xml2jsOptions = {
  compact: true,
  trim: true,
  ignoreComment: true,
};

export function formatUrl(
  baseUrl: string,
  params: { [key: string]: any } = {},
): string {
  const url = new URL(baseUrl);
  Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));
  return url.toString();
}

type AvailableDates = {
  [key: string]: number[];
};

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
): AvailableDates {
  return rawLayers.reduce((acc: any, layer: any) => {
    const layerId = get(layer, layerIdPath);
    const rawDates = get(layer, datesPath, []);

    const dates: (string | { _text: string })[] = isString(rawDates)
      ? rawDates.split(',')
      : rawDates;

    const availableDates = dates
      .filter((date) => !isEmpty(date))
      .map((date) =>
        // adding 12 hours to avoid  errors due to daylight saving
        moment.utc(get(date, '_text', date)).set({ hour: 12 }).valueOf(),
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
  if ('Layer' in rawLayers) {
    return flattenLayers(rawLayers.Layer);
  }
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
    return [];
  }
  if (isArrayOfFlatLayerContainers(rawLayers)) {
    return rawLayers.reduce(
      (acc, { Layer }) => acc.concat(Layer),
      [] as FlatLayer[],
    );
  }
  return rawLayers as FlatLayer[];
}

/**
 * List capabilities for a WMS layer.
 * @param serverUri
 */
export async function getWMSCapabilities(serverUri: string) {
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
export async function getWCSCoverage(serverUri: string) {
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

type WCSLayerUrlParams = {
  layer: AlertConfig;
  extent: Extent;
  date: Date;
};

export function getWCSLayerUrl({ layer, extent, date }: WCSLayerUrlParams) {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.serverLayerName} without providing an extent!`,
    );
  }

  return WCSRequestUrl(
    layer.baseUrl,
    layer.serverLayerName,
    date ? moment(date).format('YYYY-MM-DD') : undefined,
    extent,
    get(layer, 'wcsConfig.pixelResolution'),
  );
}
