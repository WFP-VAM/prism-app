import fetch from 'node-fetch';
import moment from 'moment';
import { xml2js } from 'xml-js';
import { get, isEmpty, isString, union } from 'lodash';
import { formatUrl } from "prism-common";
import { Extent, WCSRequestUrl } from './raster-utils';
import { AlertConfig } from '../entities/alerts.entity';

// eslint-disable-next-line fp/no-mutation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const xml2jsOptions = {
  compact: true,
  trim: true,
  ignoreComment: true,
};

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
