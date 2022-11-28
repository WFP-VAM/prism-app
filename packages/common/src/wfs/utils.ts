import { isEmpty } from "lodash";
import * as moment from "moment";

import { findTagsByPath } from "xml-utils";

import {
  DEFAULT_DATE_FORMAT,
  findAndParseAbstract,
  findTagText,
  formatUrl,
  parseName,
  setTimeoutAsync,
} from "../utils";

import {
  findAndParseKeywords,
  findAndParseOperationUrl,
  findAndParseWGS84BoundingBox,
} from "../ows";

import type { BBOX } from "../types";

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
  return origin + pathname.replace(/\/$/, "");
}

// to-do: MetadataURL
// to-do: parse prefix from name?
export function getFeatureTypesFromCapabilities(
  capabilities: string
): FeatureType[] {
  const featureTypes: FeatureType[] = [];
  findTagsByPath(capabilities, ["FeatureTypeList", "FeatureType"]).forEach(
    (featureType) => {
      const { inner } = featureType;
      if (inner) {
        const name = findTagText(inner, "Name")!;
        if (name) {
          // eslint-disable-next-line fp/no-mutating-methods
          featureTypes.push({
            name: parseName(name),
            abstract: findAndParseAbstract(inner),
            keywords: findAndParseKeywords(inner),
            srs: findTagText(inner, "DefaultSRS")!,
            bbox: findAndParseWGS84BoundingBox(inner)!,
          });
        }
      }
    }
  );
  return featureTypes;
}

export function parseFullFeatureTypeNames(
  capabilities: string,
  { sort = true }: { sort?: boolean } = { sort: true }
): string[] {
  const names = getFeatureTypesFromCapabilities(capabilities).map(
    (featureType) => featureType.name.full
  );
  if (sort) {
    // eslint-disable-next-line fp/no-mutating-methods
    names.sort();
  }
  return names;
}

// to-do: find valid prefix for given short name? make async?
export function parseGetFeatureUrl(
  capabilities: string,
  { method = "GET" }: { method: "GET" | "POST"; throw?: boolean } = {
    method: "GET",
  }
): string | undefined {
  return findAndParseOperationUrl(capabilities, "GetFeature", method);
}

export function hasFeatureType(
  featureTypes: FeatureType[],
  name: string,
  { strict = false }: { strict?: boolean } = {
    strict: false,
  }
): boolean {
  return !!featureTypes.find((featureType) => {
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

// to-do: validate cql properties based on capabilities.xml
export function getFeaturesUrl(
  capabilities: string,
  typeNameOrNames: string | string[],
  {
    bbox,
    srs,
    count,
    dateField = "timestamp",
    dateRange,
    featureId,
    format = "geojson",
    method = "POST",
    sortBy,
    version = "2.0.0",
  }: {
    bbox?: BBOX;
    srs?: string;
    count?: number;
    dateField?: string;
    dateRange?: [number, number] | [string, string];
    featureId?: string;
    format?: "geojson" | "xml";
    method?: "GET" | "POST";
    sortBy?: string;
    version?: string;
  } = {
    bbox: undefined,
    srs: undefined,
    count: undefined,
    dateField: "timestamp",
    dateRange: undefined,
    featureId: undefined,
    format: "geojson",
    method: "POST",
    sortBy: undefined,
    version: "2.0.0",
  }
) {
  const base = parseGetFeatureUrl(capabilities, { method });

  if (!base) {
    throw new Error("unable to generate wfs url from capabilities");
  }

  if (isEmpty(typeNameOrNames) && isEmpty(featureId)) {
    throw new Error("You must pass in a typeName(s) or featureId");
  }

  return formatUrl(base, {
    service: "WFS",
    version,
    request: "GetFeature",
    [/^(0|1)/.test(version)
      ? "typeName"
      : "typeNames"]: typeNameOrNames?.toString(),
    bbox: bbox?.toString(),
    featureID: featureId,
    srsName: srs,
    [/^(0|1)/.test(version) ? "maxFeatures" : "count"]: [
      null,
      undefined,
      Infinity,
    ].includes(count)
      ? undefined
      : count,
    outputFormat: format === "geojson" ? "json" : format,
    sortBy,
    cql_filter: (() => {
      if (dateRange && dateField) {
        const [startDate, endDate] = dateRange;
        const startDateFormatted = `${moment
          .utc(startDate)
          .format(DEFAULT_DATE_FORMAT)}T00:00:00`;
        const endDateFormatted = `${moment
          .utc(endDate)
          .format(DEFAULT_DATE_FORMAT)}T23:59:59`;
        return `${dateField} BETWEEN ${startDateFormatted} AND ${endDateFormatted}`;
      }
      return undefined;
    })(),
  });
}

export async function getFeatures(
  capabilities: string,
  typeNameOrNames: string | string[],
  {
    fetch: customFetch = fetch,
    format = "geojson",
    method = "POST",
    wait = 0,
    ...rest
  }: {
    fetch?: any;
    format?: "geojson" | "xml";
    method?: "GET" | "POST";
    wait?: number;
  } & Parameters<typeof getFeaturesUrl>[2] = {
    fetch: undefined,
    format: "geojson",
    method: "POST",
    wait: 0,
  }
) {
  const run = async () => {
    const url = getFeaturesUrl(capabilities, typeNameOrNames, {
      format,
      method,
      ...rest,
    });
    const response = await customFetch(url, { method });
    if (response.status !== 200) {
      throw new Error(`bad response status ${response.status}`);
    }

    if (!["geojson", "xml"].includes(format)) {
      throw new Error("invalid response format");
    }

    if (format === "geojson") {
      return response.json();
    }
    if (format === "xml") {
      return response.text();
    }
    return undefined;
  };
  return setTimeoutAsync(wait, run);
}

// export async function getLayerDates
