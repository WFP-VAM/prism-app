import {
  findTagByName,
  findTagsByName,
  findTagByPath,
  findTagsByPath,
  getAttribute,
} from 'xml-utils';

import type { WMS_OUTPUT_FORMAT } from '../types';

import {
  bboxToString,
  findName,
  findAndParseAbstract,
  findAndParseCapabilityUrl,
  findTagArray,
  findTagText,
  formatUrl,
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
  const layerIds: string[] = [];
  findLayers(xml).forEach(layer => {
    const name = findName(layer);
    if (name) {
      layerIds.push(name);
    }
  });
  return layerIds;
}

export function getLayerNames(
  xml: string,
  // sometimes layer titles will have an extra space in the front or end unsuitable for display
  { clean = false }: { clean: boolean } = { clean: false },
): string[] {
  const layerNames: string[] = [];
  findLayers(xml).forEach(layer => {
    let title = findTitle(layer);
    if (title) {
      if (clean) {
        title = title.trim();
      }
      layerNames.push(title);
    }
  });
  return layerNames;
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
export function createGetMapUrl(
  xml: string,
  layerIds: string[],
  {
    bbox,
    bboxDigits,
    bboxSrs,
    format = 'image/png',
    height,
    imageSrs,
    srs = 'EPSG:4326',
    styles,
    time,
    transparent = true,
    width,
  }: {
    bbox?: [number, number, number, number] | number[];
    bboxDigits?: number;
    bboxSrs?: number;
    format?: WMS_OUTPUT_FORMAT;
    height: number;
    imageSrs?: number;
    srs?: string;
    styles?: string[];
    time?: string;
    transparent?: boolean;
    width: number;
  },
) {
  const base = findAndParseCapabilityUrl(xml, 'GetMap');
  if (!base) {
    throw new Error('failed to create GetMap Url');
  }

  const version = '1.3.0';

  return formatUrl(base, {
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
