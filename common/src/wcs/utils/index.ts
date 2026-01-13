import { uniq, union } from "lodash";
import moment from "moment";
import { findTagsByName } from "xml-utils";

import { findAndParseEnvelope } from "../../gml";
import {
  bboxToString,
  checkExtent,
  DEFAULT_DATE_FORMAT,
  findAndParseCapabilityUrl,
  findTagArray,
  findTagText,
  findVersion,
  formatUrl,
  scaleImage,
  setNoon,
  setTimeoutAsync,
} from "../../utils";

import {
  findException,
  findAndParseBoundingBox,
  findAndParseKeywords,
  findAndParseOperationUrl,
  findAndParseWGS84BoundingBox,
  getCapabilities,
} from "../../ows";

import type { BBOX, WCS_FORMAT } from "../../types";

export type Coverage = {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  bbox: number[];
};

export function findCoverages(xml: string): string[] {
  const tagNames = [
    "wcs:CoverageOfferingBrief",
    "CoverageOfferingBrief",
    "wcs:CoverageSummary",
  ];
  // eslint-disable-next-line fp/no-mutation
  for (let i = 0; i < tagNames.length; i += 1) {
    const tagName = tagNames[i];
    if (xml.includes(tagName)) {
      return findTagsByName(xml, tagName).map((tag) => tag.outer);
    }
  }
  return [];
}

export function normalizeCoverageId(id: string): string {
  return id.replace("__", ":");
}

export function findCoverageIdentifier(xml: string): string | undefined {
  return findTagText(xml, "wcs:Identifier");
}

export function findCoverageId(xml: string): string | undefined {
  return findTagText(xml, "wcs:CoverageId");
}

export function findCoverageName(xml: string): string | undefined {
  return findTagText(xml, "name") || findTagText(xml, "wcs:name");
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

  throw new Error("unable to find coverage id");
}

export function findCoverageAbstract(xml: string): string | undefined {
  return findTagText(xml, "ows:Abstract");
}

export function findCoverageDescription(xml: string): string | undefined {
  return findTagText(xml, "description");
}

export function findLayerDescription(xml: string): string | undefined {
  return findCoverageAbstract(xml) || findCoverageDescription(xml);
}

export function findCoverageTitle(xml: string): string | undefined {
  return findTagText(xml, "ows:Title");
}

export function findCoverageLabel(xml: string): string | undefined {
  return findTagText(xml, "label");
}

export function findCoverageDisplayName(xml: string): string | undefined {
  return findCoverageTitle(xml) || findCoverageLabel(xml);
}

export function findCoverage(
  xml: string,
  layerIdOrName: string,
): string | undefined {
  const normalized = normalizeCoverageId(layerIdOrName);
  return findCoverages(xml).find(
    (layer) =>
      findLayerId(layer, { normalize: true }) === normalized ||
      findCoverageDisplayName(layer) === layerIdOrName,
  );
}

export function findCoverageDisplayNames(xml: string): string[] {
  const coverages = findCoverages(xml);
  const displayNames = coverages.map((coverage) =>
    findCoverageDisplayName(coverage),
  );
  return displayNames.filter((name) => name !== undefined).map((name) => name!);
}

export function findLayerIds(
  xml: string,
  { normalize }: { normalize?: boolean } = {},
): string[] {
  return findCoverages(xml).map((layer) => findLayerId(layer, { normalize }));
}

export function findCoverageSubType(xml: string): string | undefined {
  return findTagText(xml, "wcs:CoverageSubtype");
}
export function findAndParseLonLatEnvelope(
  xml: string,
): Readonly<[number, number, number, number] | undefined> {
  const envelope = findTagText(xml, "lonLatEnvelope");
  if (!envelope) {
    return undefined;
  }

  const [lowerCorner, upperCorner] = findTagsByName(envelope, "gml:pos");
  if (lowerCorner?.inner && upperCorner?.inner) {
    const [west, south] = lowerCorner.inner
      .split(" ")
      .map((str) => Number(str));
    const [east, north] = upperCorner.inner
      .split(" ")
      .map((str) => Number(str));
    return [west, south, east, north];
  }

  return undefined;
}

// for CoverageDescription
export function findAndParseExtent(
  xml: string,
): Readonly<[number, number, number, number]> | undefined {
  return findAndParseLonLatEnvelope(xml) || findAndParseEnvelope(xml);
}

export function findCoverageOpUrl(xml: string, op: string): string | undefined {
  return (
    findAndParseCapabilityUrl(xml, op) || findAndParseOperationUrl(xml, op)
  );
}

export function findDescribeCoverageUrl(xml: string): string | undefined {
  return findCoverageOpUrl(xml, "DescribeCoverage");
}

export function findGetCoverageUrl(xml: string): string | undefined {
  return findCoverageOpUrl(xml, "GetCoverage");
}

export function createGetCoverageUrl({
  bbox,
  bboxDigits,
  capabilities,
  checkExtent: doCheckExtent = true,
  crs = "EPSG:4326",
  date,
  format = "GeoTIFF",
  height: givenHeight,
  layerId,
  maxPixels = 5096,
  needExtent = false,
  resolution = 256,
  url,
  version = "1.0.0",
  width: givenWidth,
}: {
  bbox: BBOX;
  bboxDigits?: number;
  capabilities?: string;
  checkExtent?: boolean;
  crs?: string;
  date?: Date | string;
  format?: WCS_FORMAT | string;
  height?: number;
  layerId: string;
  maxPixels?: number;
  needExtent?: boolean;
  resolution?: number;
  url?: string;
  version?: string;
  width?: number;
}): string {
  const base = (() => {
    if (url) {
      return url;
    }
    if (capabilities) {
      return findGetCoverageUrl(capabilities);
    }
    return undefined;
  })();

  if (!base) {
    throw new Error("failed to create DescribeCoverage Url");
  }

  if (needExtent && !bbox) {
    throw new Error("no extent provided to createGetCoverageUrl");
  }

  if (doCheckExtent) {
    checkExtent(bbox);
  }

  const { height, width } = (() => {
    if (
      (typeof givenHeight !== "number" && typeof givenWidth !== "number") ||
      (givenHeight && givenHeight > maxPixels) ||
      (givenWidth && givenWidth > maxPixels)
    ) {
      return scaleImage(bbox, { maxPixels, resolution });
    }
    return { height: givenHeight, width: givenWidth };
  })();

  const time = date ? moment(date).format(DEFAULT_DATE_FORMAT) : undefined;

  if (version.startsWith("0") || version.startsWith("1")) {
    return formatUrl(base, {
      bbox: bboxToString(bbox, bboxDigits),
      coverage: layerId,
      crs,
      format,
      height,
      request: "GetCoverage",
      service: "WCS",
      time,
      version,
      width,
    });
  }
  if (version.startsWith("2")) {
    // Subsets are used as spatial and temporal filters.
    // For more info: https://docs.geoserver.geo-solutions.it/edu/en/wcs/get.html
    const spatialSubsets = (() => {
      if (bbox) {
        const [xmin, ymin, xmax, ymax] = bbox;
        return [`Long(${xmin},${xmax})`, `Lat(${ymin},${ymax})`];
      }
      return [];
    })();

    const temporalSubsets = time ? [`time("${time}")`] : [];

    const subsets = [...spatialSubsets, ...temporalSubsets];

    const formattedUrl = formatUrl(base, {
      format,
      coverageId: layerId,
      height,
      outputCRS: crs,
      request: "GetCoverage",
      service: "WCS",
      width,
    });

    const formattedSubsets = subsets.map((s) => `subset=${s}`).join("&");

    return `${formattedUrl}&${formattedSubsets}`;
  }
  throw new Error(
    "[prism-common] createGetCoverageUrl was called with an unexpected version",
  );
}

export function createDescribeCoverageUrl(
  xml: string,
  layerId: string,
): string {
  const base = findDescribeCoverageUrl(xml);
  if (!base) {
    throw new Error("failed to create DescribeCoverage Url");
  }

  const version = findVersion(xml)!;

  const layerParamName = (() => {
    if (version.startsWith("1.1")) {
      return "identifiers";
    }
    if (version.startsWith("0") || version.startsWith("1")) {
      return "coverage";
    }
    return "coverageId";
  })();

  return formatUrl(base, {
    [layerParamName]: layerId,
    request: "DescribeCoverage",
    service: "WCS",
    version,
  });
}

export async function fetchCoverageDescriptionFromCapabilities(
  capabilities: string,
  layerId: string,
  options: { debug?: boolean; fetch?: any; wait?: number } = {},
) {
  const run = async () => {
    const url = createDescribeCoverageUrl(capabilities, layerId);
    const response = await (options.fetch || fetch)(url);
    if (response.status !== 200) {
      throw new Error(
        `failed to fetch CoverageDescription from "${url}". status was ${response.status}`,
      );
    }
    const text = await response.text();
    const exception = findException(text);
    if (exception) {
      throw new Error(
        `couldn't fetch coverage description because of the following error:\n${exception}`,
      );
    }
    return text;
  };
  return setTimeoutAsync(options.wait || 0, run);
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

export function findAndParseCoverage(xml: string, layerIdOrName: string) {
  const coverage = findCoverage(xml, layerIdOrName);
  return coverage ? parseCoverage(coverage) : undefined;
}

export function parseDates(description: string): string[] {
  const timePositions = findTagArray(description, [
    "domainSet",
    "temporalDomain",
    "gml:timePosition",
  ]);

  if (timePositions.length > 0) {
    return timePositions;
  }

  return findTagArray(description, ["lonLatEnvelope", "gml:timePosition"]);
}

export function parseSupportedFormats(xml: string): string[] {
  return findTagArray(xml, ["supportedFormats", "formats"]);
}

export function parseLayerDays(xml: string): number[] {
  const dateStrings = parseDates(xml);

  // round to noon to avoid errors due to daylight saving
  const days = dateStrings.map(setNoon);

  const uniqueDays = uniq(days);

  return uniqueDays.map((date) => new Date(date).getTime());
}

export function getAllLayerDays(xml: string): { [layerId: string]: number[] } {
  const layers = findCoverages(xml);
  const allDays: { [key: string]: number[] } = {};
  layers.forEach((layer) => {
    const layerId = findLayerId(layer);
    if (layerId) {
      const oldLayerDays = allDays[layerId] || [];
      const layerDays = parseLayerDays(layer);
      // eslint-disable-next-line fp/no-mutation
      allDays[layerId] = union(layerDays, oldLayerDays);
    }
  });
  return allDays;
}

export async function fetchCoverageLayerDays(
  url: string,
  {
    errorStrategy = "throw",
    fetch,
  }: { errorStrategy?: string; fetch?: any } = {},
): Promise<{ [layerId: string]: number[] }> {
  try {
    const capabilities = await getCapabilities(url, {
      fetch,
      version: "1.0.0",
    });
    return getAllLayerDays(capabilities);
  } catch (error) {
    if (errorStrategy === "empty") {
      return {};
    }
    throw error;
  }
}
