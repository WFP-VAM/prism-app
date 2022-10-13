import {
  findTagsByName,
  findTagsByPath,
  getAttribute,
} from 'xml-utils';

import { findAndParseEnvelope } from '../../gml';
import {
  bboxToString,
  checkExtent,
  findAndParseCapabilityUrl,
  findTagText,
  formatUrl,
  scaleImage,
} from '../../utils';

import {
  findAndParseBoundingBox,
  findAndParseKeywords,
  findAndParseOperationUrl,
  findAndParseWGS84BoundingBox,
} from '../../ows';

import type { BBOX } from '../../types';

export type Coverage = {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  bbox: number[];
};

export function findCoverages(xml: string): string[] {
  const tagNames = ['CoverageOfferingBrief', 'wcs:CoverageSummary'];
  for (let i = 0; i < tagNames.length; i++) {
    const tagName = tagNames[i];
    if (xml.includes(tagName)) {
      return findTagsByName(xml, tagName).map(tag => tag.outer);
    }
  }
  return [];
}

export function normalizeCoverageId(id: string): string {
  return id.replace('__', ':');
}

export function findCoverageIdentifier(xml: string): string | undefined {
  return findTagText(xml, 'wcs:Identifier');
}

export function findCoverageId(xml: string): string | undefined {
  return findTagText(xml, 'wcs:CoverageId');
}

export function findLayerId(
  xml: string,
  { normalize = true }: { normalize?: boolean } = { normalize: true },
): string {
  // version 2.x
  const coverageId = findCoverageId(xml);
  if (coverageId) {
    return normalize ? normalizeCoverageId(coverageId) : coverageId;
  }

  // version 1.1.x
  const identifier = findCoverageIdentifier(xml);
  if (identifier) {
    return identifier;
  }

  // version 1.0
  const name = findCoverageName(xml);
  if (name) {
    return name;
  }

  throw new Error('unable to find coverage id');
}

export function findCoverageAbstract(xml: string): string | undefined {
  return findTagText(xml, 'ows:Abstract');
}

export function findCoverageDescription(xml: string): string | undefined {
  return findTagText(xml, 'description');
}

export function findLayerDescription(xml: string): string | undefined {
  return findCoverageAbstract(xml) || findCoverageDescription(xml);
}

export function findCoverageName(xml: string): string | undefined {
  return findTagText(xml, 'name');
}

export function findCoverageTitle(xml: string): string | undefined {
  return findTagText(xml, 'ows:Title');
}

export function findCoverageLabel(xml: string): string | undefined {
  return findTagText(xml, 'label');
}

export function findCoverageDisplayName(xml: string): string | undefined {
  return findCoverageTitle(xml) || findCoverageLabel(xml);
}

export function findCoverage(
  xml: string,
  layerName: string,
): string | undefined {
  return findCoverages(xml).find(
    layer => findCoverageTitle(layer) === layerName,
  );
}

export function findCoverageDisplayNames(xml: string): string[] {
  const displayNames: string[] = [];
  findCoverages(xml).forEach(layer => {
    const displayName = findCoverageDisplayName(layer);
    if (displayName) {
      displayNames.push(displayName);
    }
  });
  return displayNames;
}

export function findLayerIds(
  xml: string,
  { normalize }: { normalize?: boolean } = {},
): string[] {
  return findCoverages(xml).map(layer => findLayerId(layer, { normalize }));
}

export function findCoverageSubType(xml: string): string | undefined {
  return findTagText(xml, 'wcs:CoverageSubtype');
}

export function findAndParseLonLatEnvelope(
  xml: string,
): undefined | Readonly<[number, number, number, number]> {
  const envelope = findTagText(xml, 'lonLatEnvelope');
  if (!envelope) {
    return;
  }

  const [lowerCorner, upperCorner] = findTagsByName(envelope, 'gml:pos');
  if (lowerCorner?.inner && upperCorner?.inner) {
    const [west, south] = lowerCorner.inner.split(' ').map(str => Number(str));
    const [east, north] = upperCorner.inner.split(' ').map(str => Number(str));
    return [west, south, east, north];
  }
}

// for CoverageDescription
export function findAndParseExtent(
  xml: string,
): Readonly<[number, number, number, number]> | undefined {
  return findAndParseEnvelope(xml) || findAndParseLonLatEnvelope(xml);
}

export function findCoverageOpUrl(xml: string, op: string): string | undefined {
  return (
    findAndParseCapabilityUrl(xml, op) || findAndParseOperationUrl(xml, op)
  );
}

export function findDescribeCoverageUrl(xml: string): string | undefined {
  return findCoverageOpUrl(xml, 'DescribeCoverage');
}

export function findGetCoverageUrl(xml: string): string | undefined {
  return findCoverageOpUrl(xml, 'GetCoverage');
}

// export function formatGetCoverageUrl(
//   xml: string,
//   { cql_filter, format, namespace, sortBy }:
//   { cql_filter?: string, format: CoverageFormat, namespace?: string, sortBy?: string }
// ): string {
//   return "";
// }

export function createGetCoverageUrl(
  xml: string,
  layerId: string,
  {
    bbox,
    bboxDigits,
    check_extent = true,
    crs = 'EPSG:4326',
    format = 'GeoTIFF',
    height,
    max_pixels = 5096,
    resolution = 256,
    time,
    width,
  }: {
    bbox: BBOX;
    bboxDigits?: number;
    check_extent?: boolean;
    crs?: string;
    format?: string;
    height: number;
    max_pixels?: number;
    resolution?: 256;
    time?: string;
    width: number;
  },
): string {
  const base = findGetCoverageUrl(xml);
  if (!base) {
    throw new Error('failed to create DescribeCoverage Url');
  }

  if (check_extent) {
    checkExtent(bbox);
  }

  if (
    (typeof height !== 'number' && typeof width !== 'number') ||
    height > max_pixels ||
    width > max_pixels
  ) {
    ({ height, width } = scaleImage(bbox, { max_pixels, resolution }));
  }

  return formatUrl(base, {
    bbox: bboxToString(bbox, bboxDigits),
    coverage: layerId,
    crs,
    format,
    height,
    request: 'GetCoverage',
    service: 'WCS',
    time,
    version: '1.0.0',
    width,
  });
}

export function createDescribeCoverageUrl(
  xml: string,
  layerId: string,
): string {
  const base = findDescribeCoverageUrl(xml);
  if (!base) {
    throw new Error('failed to create DescribeCoverage Url');
  }
  const url = new URL(base);
  const version = getAttribute(xml, 'version');
  url.searchParams.set('coverage', layerId);
  url.searchParams.set('request', 'DescribeCoverage');
  url.searchParams.set('service', 'WCS');
  url.searchParams.set('version', version);
  return url.toString();
}

export async function fetchCoverageDescriptionFromCapabilities(
  capabilities: string,
  layerId: string,
  options: { fetch?: any } = {},
) {
  const url = createDescribeCoverageUrl(capabilities, layerId);
  const response = await (options.fetch || fetch)(url);
  if (response.status !== 200) {
    throw new Error('failed to fetch CoverageDescription');
  }
  return response.text();
}

export function parseCoverage(xml: string) {
  return {
    id: findLayerId(xml),
    name: findCoverageDisplayName(xml),
    description: findLayerDescription(xml),
    keywords: findAndParseKeywords(xml),
    bbox: findAndParseBoundingBox(xml),
    wgs84bbox:
      findAndParseWGS84BoundingBox(xml) || findAndParseLonLatEnvelope(xml),
    subType: findCoverageSubType(xml),
  };
}

export function parseDates(description: string): string[] {
  const path = ['domainSet', 'temporalDomain', 'gml:timePosition'];
  const dates: string[] = [];
  findTagsByPath(description, path).forEach(tag => {
    if (tag?.inner) {
      dates.push(tag.inner);
    }
  });
  return dates;
}

export function parseSupportedFormats(xml: string): string[] {
  const formats: string[] = [];
  findTagsByPath(xml, ['supportedFormats', 'formats']).forEach(tag => {
    if (tag?.inner) {
      formats.push(tag.inner);
    }
  });
  return formats;
}
