import {
  findTagByName,
  findTagsByName,
  findTagByPath,
  findTagsByPath,
  getAttribute,
} from 'xml-utils';

import { uniq, union } from 'lodash';

import type { WMS_OUTPUT_FORMAT } from '../types';

import {
  bboxToString,
  findName,
  findAndParseAbstract,
  findAndParseCapabilityUrl,
  findTagArray,
  findTagText,
  formatUrl,
  setNoon,
  parseName,
} from '../../utils';

type Legend = {
  width: number;
  height: number;
  format: string;
  url: string;
};

type Style = {
  name: string;
  title: string;
  legends: Legend[];
};

type WMSLayer = {
  name: string;
  namespace?: string | undefined;
  abstract: string | undefined;
  keywords: string[];
  srs: string[];
  bbox?: Readonly<[number, number, number, number]>;
  attribution?: {
    title?: string;
  };
  styles: Style[];
  dates: string[];
};

export function findLayers(xml: string): string[] {
  return findTagsByPath(xml, ['Layer', 'Layer']).map(tag => tag.outer);
}

export function findTitle(xml: string): string | undefined {
  return findTagText(xml, 'Title');
}

export function findLayer(xml: string, layerName: string): string | undefined {
  return findLayers(xml).find(layer => findName(layer) === layerName);
}

export function getLayerIds(xml: string): string[] {
  return findLayers(xml)
    .map(layer => findName(layer) || '')
    .filter(id => id !== '');
}

export function getLayerNames(
  xml: string,
  // sometimes layer titles will have an extra space in the front or end unsuitable for display
  { clean = false }: { clean: boolean } = { clean: false },
): string[] {
  const layers = findLayers(xml);
  const titles = layers.map(layer => findTitle(layer) || '');
  const filteredTitles = titles.filter(title => title !== '');
  return clean ? filteredTitles.map(title => title.trim()) : filteredTitles;
}

export function parseLayerDates(xml: string): string[] {
  if (!xml) {
    throw new Error("can't parse nothing");
  }
  const dimensions = findTagsByName(xml, 'Dimension');
  const timeDimension = dimensions.find(dimension => {
    return getAttribute(dimension.outer, 'name') === 'time';
  });
  if (!timeDimension?.inner) {
    return [];
  }
  // we have to trim because sometimes WMS adds spaces or new line
  return timeDimension.inner
    .trim()
    .split(',')
    .map(datetime => datetime.trim());
}

export function getLayerDates(xml: string, layerName: string): string[] {
  const layer = findLayer(xml, layerName);
  if (!layer) {
    throw new Error("can't find layer");
  }
  return parseLayerDates(layer);
}

export function parseLayerDays(xml: string): number[] {
  const dateStrings = parseLayerDates(xml);

  // round to noon to avoid errors due to daylight saving
  const days = dateStrings.map(setNoon);

  const uniqueDays = uniq(days);

  return uniqueDays.map(date => new Date(date).getTime());
}

export function getAllLayerDays(xml: string): { [layerId: string]: number[] } {
  const layers = findLayers(xml);
  const allDays: { [key: string]: number[] } = {};
  for (let i = 0; i < layers.length; i += 1) {
    const layer = layers[i];
    const layerId = findName(layer);
    if (layerId) {
      const oldLayerDays = allDays[layerId] || [];
      const layerDays = parseLayerDays(layer);
      allDays[layerId] = union(layerDays, oldLayerDays);
    }
  }
  return allDays;
}

// parses an xml representation of a layer
// converting into into an object
export function parseLayer(xml: string): WMSLayer | undefined {
  const name = findName(xml);
  if (!name) {
    return undefined;
  }
  const { short, namespace } = parseName(name);
  return {
    name: short,
    namespace,
    abstract: findAndParseAbstract(xml),
    keywords: findTagArray(xml, 'Keyword'),
    srs: ((): string[] => {
      // sometimes called CRS or SRS depending on the WMS version
      return [...findTagArray(xml, 'CRS'), ...findTagArray(xml, 'SRS')];
    })(),
    bbox: (() => {
      const ExGeographicBoundingBox = findTagByName(
        xml,
        'EX_GeographicBoundingBox',
      );
      if (ExGeographicBoundingBox) {
        const { inner } = ExGeographicBoundingBox;
        if (inner) {
          return [
            Number(findTagText(inner, 'westBoundLongitude')),
            Number(findTagText(inner, 'southBoundLatitude')),
            Number(findTagText(inner, 'eastBoundLongitude')),
            Number(findTagText(inner, 'northBoundLatitude')),
          ] as const;
        }
      }
      return undefined;
    })(),
    attribution: ((): { title: string } | undefined => {
      const tag = findTagByPath(xml, ['Attribution', 'Title']);
      if (!tag?.inner) {
        return undefined;
      }
      return { title: tag.inner };
    })(),
    dates: parseLayerDates(xml),
    styles: [], // to-do
  };
}

// to-do: bgcolor, sld, sld_body
export function createGetMapUrl({
  base,
  bbox,
  bboxDigits,
  bboxSrs,
  capabilities,
  format = 'image/png',
  height,
  imageSrs,
  layerIds,
  srs = 'EPSG:4326',
  styles,
  time,
  transparent = true,
  version = '1.3.0',
  width,
}: {
  base?: string | undefined;
  bbox?: [number, number, number, number] | number[];
  bboxDigits?: number;
  bboxSrs?: number;
  capabilities?: string;
  format?: WMS_OUTPUT_FORMAT;
  height: number;
  imageSrs?: number;
  layerIds: string[];
  srs?: string;
  styles?: string[];
  time?: string;
  transparent?: boolean;
  version?: string;
  width: number;
}) {
  const baseUrl = (() => {
    if (base) {
      return base;
    }
    if (capabilities) {
      return findAndParseCapabilityUrl(capabilities, 'GetMap');
    }
    return undefined;
  })();

  if (!baseUrl) {
    throw new Error('failed to create GetMap Url');
  }

  return formatUrl(baseUrl, {
    bbox: bbox ? bboxToString(bbox, bboxDigits) : undefined,
    bboxsr: bboxSrs ? bboxSrs.toString() : undefined,
    format,
    height,
    imagesr: imageSrs ? imageSrs.toString() : undefined,
    layers: layerIds.toString(),
    request: 'GetMap',
    service: 'WMS',
    srs,
    styles: styles?.join(','),
    time,
    transparent,
    version,
    [version === '1.3.0' ? 'crs' : 'srs']: srs,
    width,
  });
}
