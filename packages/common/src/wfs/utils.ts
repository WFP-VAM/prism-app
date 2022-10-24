import { isEmpty } from 'lodash';

import { findTagsByPath } from 'xml-utils';

import {
  findAndParseAbstract,
  findTagText,
  parseName,
  setTimeoutAsync,
} from '../utils';

import {
  findAndParseKeywords,
  findAndParseOperationUrl,
  findAndParseWGS84BoundingBox,
} from '../ows';

import type { BBOX } from '../types';

type FeatureType = {
  name: ReturnType<typeof parseName>;
  abstract: string | undefined;
  keywords: string[];
  srs: string;
  bbox: Readonly<[number, number, number, number]>;
};

// can be getcapabilities request or anything else
export function getBaseUrl(url: string): string {
  const { origin, pathname } = new URL(url);
  // remove trailing /
  return origin + pathname.replace(/\/$/, '');
}

// to-do: MetadataURL
// to-do: parse prefix from name?
export function getFeatureTypesFromCapabilities(
  capabilities: string,
): FeatureType[] {
  const featureTypes: FeatureType[] = [];
  findTagsByPath(capabilities, ['FeatureTypeList', 'FeatureType']).forEach(
    featureType => {
      const { inner } = featureType;
      if (inner) {
        const name = findTagText(inner, 'Name')!;
        if (name) {
          featureTypes.push({
            name: parseName(name),
            abstract: findAndParseAbstract(inner),
            keywords: findAndParseKeywords(inner),
            srs: findTagText(inner, 'DefaultSRS')!,
            bbox: findAndParseWGS84BoundingBox(inner)!,
          });
        }
      }
    },
  );
  return featureTypes;
}

export function parseFullFeatureTypeNames(
  capabilities: string,
  { sort = true }: { sort?: boolean } = { sort: true },
): string[] {
  const names = getFeatureTypesFromCapabilities(capabilities).map(
    featureType => featureType.name.full,
  );
  if (sort) {
    names.sort();
  }
  return names;
}

// to-do: find valid prefix for given short name? make async?
export function parseGetFeatureUrl(
  capabilities: string,
  { method = 'GET' }: { method: 'GET' | 'POST'; throw?: boolean } = {
    method: 'GET',
  },
): string | undefined {
  return findAndParseOperationUrl(capabilities, 'GetFeature', method);
}

export function hasFeatureType(
  featureTypes: FeatureType[],
  name: string,
  { strict = false }: { strict?: boolean } = {
    strict: false,
  },
): boolean {
  return !!featureTypes.find(featureType => {
    if (strict) {
      return featureType.name.full === name;
    }
    const parsed = parseName(name);
    return (
      featureType.name.short === parsed.short &&
      (parsed.namespace
        ? featureType.name.namespace === parsed.namespace
        : true)
    );
  });
}

export function getFeaturesUrl(
  capabilities: string,
  typeNameOrNames: string | string[],
  {
    bbox,
    srs,
    count,
    featureId,
    format = 'geojson',
    method = 'POST',
    sortBy,
    version = '2.0.0.',
  }: {
    bbox?: BBOX;
    srs?: string;
    count?: number;
    featureId?: string;
    format?: 'geojson' | 'xml';
    method?: 'GET' | 'POST';
    sortBy?: string;
    version?: string;
  } = {
    bbox: undefined,
    srs: undefined,
    count: undefined,
    featureId: undefined,
    format: 'geojson',
    method: 'POST',
    sortBy: undefined,
    version: '2.0.0.',
  },
) {
  const base = parseGetFeatureUrl(capabilities, { method });

  if (!base) {
    throw new Error('unable to generate wfs url from capabilities');
  }

  const url = new URL(base);

  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', version);
  url.searchParams.set('request', 'GetFeature');

  if (isEmpty(typeNameOrNames) && isEmpty(featureId)) {
    throw new Error('You must pass in a typeName(s) or featureId');
  }

  if (typeNameOrNames) {
    if (version.startsWith('0') || version.startsWith('1')) {
      url.searchParams.set('typeName', typeNameOrNames.toString());
    } else {
      url.searchParams.set('typeNames', typeNameOrNames.toString());
    }
  }

  if (bbox) {
    url.searchParams.set('bbox', bbox.toString());
  }
  if (srs) {
    url.searchParams.set('srsName', srs);
  }

  if (count) {
    if (version.startsWith('0') || version.startsWith('1')) {
      url.searchParams.set('maxFeatures', count.toString());
    } else {
      url.searchParams.set('count', count.toString());
    }
  }

  if (format === 'geojson') {
    url.searchParams.set('outputFormat', 'json');
  }

  if (typeof sortBy === 'string' && sortBy.length > 0) {
    url.searchParams.set('sortBy', sortBy);
  }

  return url.toString();
}

export async function getFeatures(
  capabilities: string,
  typeNameOrNames: string | string[],
  {
    count = 10,
    fetch: customFetch = fetch,
    format = 'geojson',
    method = 'POST',
    wait = 0,
    ...rest
  }: {
    count?: number;
    fetch?: any;
    format?: 'geojson' | 'xml';
    method?: 'GET' | 'POST';
    wait?: number;
  } = {
    count: 10,
    fetch: undefined,
    format: 'geojson',
    method: 'POST',
    wait: 0,
  },
) {
  const run = async () => {
    const url = getFeaturesUrl(capabilities, typeNameOrNames, {
      count,
      format,
      method,
      ...rest,
    });
    const response = await customFetch(url, { method });
    if (response.status !== 200) {
      throw new Error(`bad response status ${response.status}`);
    }

    if (!['geojson', 'xml'].includes(format)) {
      throw new Error('invalid response format');
    }

    if (format === 'geojson') {
      return response.json();
    }
    if (format === 'xml') {
      return response.text();
    }
    return undefined;
  };
  return setTimeoutAsync(wait, run);
}

// export async function getLayerDates
