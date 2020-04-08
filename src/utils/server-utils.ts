import moment from 'moment';
import { xml2js } from 'xml-js';
import { Map } from 'immutable';
import { merge, unset, get, isString, union, isEmpty } from 'lodash';
import { format, parse } from 'url';

import config from '../config/prism.json';
import { AvailableDates } from '../config/types';

const xml2jsOptions = {
  compact: true,
  trim: true,
  ignoreComment: true,
};

export function formatServerUri(
  serverUri: string,
  queryProp: { [key: string]: string | boolean | number },
) {
  // The second arg of 'parse' allows us to have 'query' as an object
  const { query, ...parsedUrl } = parse(serverUri, true);

  // Removing 'search' to be able to format by 'query'
  unset(parsedUrl, 'search');

  return decodeURI(format({ ...parsedUrl, query: merge(query, queryProp) }));
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
): { [key: string]: number[] } {
  return rawLayers.reduce((acc: any, layer: any) => {
    const layerId = get(layer, layerIdPath);
    const rawDates = get(layer, datesPath, []);

    const dates: (string | { _text: string })[] = isString(rawDates)
      ? rawDates.split(',')
      : rawDates;

    const availableDates = dates
      .filter(date => !isEmpty(date))
      .map(date => moment(get(date, '_text', date)).valueOf());

    if (Object.prototype.hasOwnProperty.call(acc, layerId)) {
      const { [layerId]: oldLayerDates } = acc;
      return {
        ...acc,
        [layerId]: union(availableDates, oldLayerDates),
      };
    }

    return {
      ...acc,
      [layerId]: availableDates,
    };
  }, {});
}

/**
 * List capabilities for a WMS layer.
 * @param serverUri
 */
async function getWMSCapabilities(serverUri: string) {
  const requestUri = formatServerUri(serverUri, { request: 'GetCapabilities' });

  return new Promise(resolve => {
    fetch(requestUri)
      .then(response => response.text())
      .then(responseText => xml2js(responseText, xml2jsOptions))
      .then(responseJs => {
        const rawLayers = get(
          responseJs,
          'WMS_Capabilities.Capability.Layer.Layer',
        );

        const layers = formatCapabilitiesInfo(
          rawLayers,
          'Name._text',
          'Dimension._text',
        );

        resolve(Map(layers));
      })
      .catch(error => {
        console.error(
          `Server returns an error for request GET/${requestUri}, error: ${error}`,
        );
        resolve(Map());
      });
  }) as Promise<AvailableDates>;
}

/**
 * List capabilities for a WCS layer.
 * @param serverUri
 */
async function getWCSCoverage(serverUri: string) {
  const requestUri = formatServerUri(serverUri, {
    request: 'DescribeCoverage',
  });

  return new Promise(resolve => {
    fetch(requestUri)
      .then(response => response.text())
      .then(responseText => xml2js(responseText, xml2jsOptions))
      .then(responseJs => {
        const rawLayers = get(
          responseJs,
          'CoverageDescription.CoverageOffering',
        );

        const layers = formatCapabilitiesInfo(
          rawLayers,
          'name._text',
          'domainSet.temporalDomain.gml:timePosition',
        );

        resolve(Map(layers));
      })
      .catch(error => {
        console.error(
          `Server returns an error for request GET/${requestUri}, error: ${error}`,
        );
        resolve(Map());
      });
  }) as Promise<AvailableDates>;
}

/**
 * Given a WMS or WCS serverUri, return a Map of available dates
 * @return a Promise of Map<layerId, availableDate[]>
 */
export async function getLayersAvailableDates() {
  const wmsServerUrl = get(config, 'serversUrls.wms', '');
  const wcsServerUrl = get(config, 'serversUrls.wcs', '');

  const [wmsAvailableDates, wcsAvailableDates] = await Promise.all([
    getWMSCapabilities(wmsServerUrl),
    getWCSCoverage(wcsServerUrl),
  ]);

  return Promise.resolve(wmsAvailableDates.merge(wcsAvailableDates)) as Promise<
    AvailableDates
  >;
}
