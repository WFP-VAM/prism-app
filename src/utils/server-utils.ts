import moment from 'moment';
import { xml2js } from 'xml-js';
import { get, isEmpty, isString, merge, union } from 'lodash';
import config from '../config/prism.json';
import { LayerDefinitions } from '../config/utils';
import type { AvailableDates, GroundstationLayerProps } from '../config/types';
import type { GroundstationLayerData } from '../context/layers/groundstation';

// Note: PRISM's date picker only works with dates where their time is midnight in the UTC timezone (possible dates passed in should be 2020-xx-xx 00:00 Midnight in UTC    -    2020-xx-xx 10:00 in Australia East Coast)
// Therefore, ambiguous dates (dates passed as string e.g 2020-08-01) shouldn't be calculated from the user's timezone and instead be converted directly to UTC. Possibly with moment.utc(string)
//

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
): AvailableDates {
  return rawLayers.reduce((acc: any, layer: any) => {
    const layerId = get(layer, layerIdPath);
    const rawDates = get(layer, datesPath, []);

    const dates: (string | { _text: string })[] = isString(rawDates)
      ? rawDates.split(',')
      : rawDates;

    const availableDates = dates
      .filter(date => !isEmpty(date))
      .map(date => moment.utc(get(date, '_text', date)).valueOf());

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
async function getWMSCapabilities(serverUri: string) {
  const requestUri = formatUrl(serverUri, { request: 'GetCapabilities' });

  try {
    const response = await fetch(requestUri);
    if (!response.ok)
      throw new Error(`${response.status}: ${response.statusText}`);
    const responseText = await response.text();
    const responseJS = xml2js(responseText, xml2jsOptions);

    const rawLayers = get(responseJS, 'WMS_Capabilities.Capability.Layer');
    const flatLayers = flattenLayers(rawLayers);

    return formatCapabilitiesInfo(flatLayers, 'Name._text', 'Dimension._text');
  } catch (error) {
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
    if (!response.ok)
      throw new Error(`${response.status}: ${response.statusText}`);
    const responseText = await response.text();
    const responseJS = xml2js(responseText, xml2jsOptions);

    const rawLayers = get(responseJS, 'CoverageDescription.CoverageOffering');

    return formatCapabilitiesInfo(
      rawLayers,
      'name._text',
      'domainSet.temporalDomain.gml:timePosition',
    );
  } catch (error) {
    console.error(error);
    return {};
  }
}

/**
 * Gets the available dates for a groundstation layer
 *
 * in layers.json each uri is given a constant, large date range (2000-01-01 -> 2023-12-21) to try get the api to give all data
 * TODO Once the api is fixed this needs to be fixed as its currently a hacky solution to get around the api's caveats
 *
 */
async function getGroundstationCoverage(layer: GroundstationLayerProps) {
  const { data: url, fallbackData: fallbackUrl, id } = layer;
  const loadGroundstationDataFromURL = async (fetchUrl: string) => {
    const data = (await (
      await fetch(fetchUrl || '', {
        mode: fetchUrl.startsWith('http') ? 'cors' : 'same-origin',
      })
    ).json()) as GroundstationLayerData & { date: string }; // raw data comes in as string yyyy-mm-dd, needs to be converted to number.
    return data.map(item => ({
      ...item,
      date: moment.utc(item.date).valueOf(),
    }));
  };
  const data = await loadGroundstationDataFromURL(url).catch(err => {
    console.error(err);
    console.warn(
      `Failed loading groundstation layer: ${id}. Attempting to load fallback URL...`,
    );
    return loadGroundstationDataFromURL(fallbackUrl || '');
  });
  const possibleDates = data
    .map(item => moment.utc(item.date).valueOf())
    .filter((date, index, arr) => {
      return arr.indexOf(date) === index;
    }); // filter() here removes duplicate dates because indexOf will always return the first occurrence of an item

  // this is exclusive to this specific API, we need to fetch all groundstation data to just get the dates. To optimise, why not store it?
  /* possibleDates.forEach(date => {
    const pointsThatMatchDate = data.filter(item => item.date === date);
    // TODO make cache
  }); */
  return possibleDates;
}

/**
 * Given a WMS or WCS serverUri, return a Map of available dates.
 *
 * We also now load possible dates for groundstation layers
 * @return a Promise of Map<layerId, availableDate[]>
 */
export async function getLayersAvailableDates() {
  // https://mng.prism.services/temp/Temperature?beginDateTime=2020-05-01&endDateTime=2020-05-01
  const wmsServerUrls: string[] = get(config, 'serversUrls.wms', []);
  const wcsServerUrls: string[] = get(config, 'serversUrls.wcs', []);

  const groundstationLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is GroundstationLayerProps => layer.type === 'groundstation',
  );

  const layerDates: AvailableDates[] = await Promise.all([
    ...wmsServerUrls.map(url => getWMSCapabilities(url)),
    ...wcsServerUrls.map(url => getWCSCoverage(url)),
    ...groundstationLayers.map(async layer => ({
      [layer.id]: await getGroundstationCoverage(layer),
    })),
  ]);

  return merge({}, ...layerDates);
}
