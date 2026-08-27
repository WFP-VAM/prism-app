import type { DateItem } from 'config/types';

export interface StacAsset {
  href: string;
  type?: string;
  title?: string;
  roles?: string[];
}

export interface StacDocument {
  type: string;
  id?: string;
  attribution?: string;
  extent?: {
    temporal?: {
      interval?: Array<[string | null, string | null]>;
    };
  };
  properties?: {
    start_datetime?: string;
    end_datetime?: string;
  };
  assets?: Record<string, StacAsset>;
}

export interface DynamicalStacMetadata {
  repoUrl: string;
  temporalStart: Date;
  temporalEnd: Date | null;
}

const ICECHUNK_ASSET_TITLES = ['Icechunk v2 repository', 'icechunk'];

/**
 * Convert `s3://bucket/prefix` to anonymous HTTPS URL for icechunk-js.
 *
 * TODO: buckets outside the default region need a `repo_url` override.
 */
export function s3ToHttpsUrl(s3Url: string, region = 'us-west-2'): string {
  const match = /^s3:\/\/([^/]+)\/(.*)$/.exec(s3Url);
  if (!match) {
    return s3Url;
  }
  const [, bucket, prefix] = match;
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedPrefix}`;
}

/** TODO: resolve plain Zarr asset roles too when an `http` store is supported. */
function resolveIcechunkAssetHref(doc: StacDocument): string | undefined {
  if (!doc.assets) {
    return undefined;
  }

  const byKey = doc.assets.icechunk?.href;
  if (byKey) {
    return byKey;
  }

  const byTitle = Object.values(doc.assets).find(asset =>
    ICECHUNK_ASSET_TITLES.some(
      title => asset.title?.toLowerCase() === title.toLowerCase(),
    ),
  )?.href;

  return byTitle;
}

function parseTemporalExtent(doc: StacDocument): {
  start: Date;
  end: Date | null;
} {
  const interval = doc.extent?.temporal?.interval?.[0];
  const startStr =
    interval?.[0] ?? doc.properties?.start_datetime ?? '2021-01-01T00:00:00Z';
  const endStr = interval?.[1] ?? doc.properties?.end_datetime ?? null;

  return {
    start: new Date(startStr),
    end: endStr ? new Date(endStr) : null,
  };
}

/** Fetch STAC collection/item and resolve Icechunk repo URL + temporal extent. */
export async function fetchDynamicalStacMetadata(
  stacUrl: string,
  repoUrlOverride?: string,
): Promise<DynamicalStacMetadata> {
  const response = await fetch(stacUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch STAC document (${response.status}): ${stacUrl}`,
    );
  }

  const doc = (await response.json()) as StacDocument;
  const assetHref = resolveIcechunkAssetHref(doc);

  let repoUrl = repoUrlOverride;
  if (!repoUrl) {
    if (!assetHref) {
      throw new Error(
        `No Icechunk v2 repository asset found in STAC document: ${stacUrl}`,
      );
    }
    repoUrl = assetHref.startsWith('s3://')
      ? s3ToHttpsUrl(assetHref)
      : assetHref;
  }

  const { start, end } = parseTemporalExtent(doc);

  return {
    repoUrl,
    temporalStart: start,
    temporalEnd: end,
  };
}

function buildDailyDateItems(
  startMs: number,
  endMs: number,
  generateDefaultDateItem: (date: number) => DateItem,
): DateItem[] {
  const dates: DateItem[] = [];
  const cursor = new Date(startMs);
  cursor.setUTCHours(12, 0, 0, 0);

  while (cursor.getTime() <= endMs) {
    dates.push(generateDefaultDateItem(cursor.getTime()));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

/** Build daily DateItem[] from a STAC temporal extent (coarse timeline control). */
export function generateDailyDatesFromExtent(
  start: Date,
  end: Date | null,
  generateDefaultDateItem: (date: number) => DateItem,
): DateItem[] {
  return buildDailyDateItems(
    start.getTime(),
    (end ?? new Date()).getTime(),
    generateDefaultDateItem,
  );
}

/**
 * Build daily DateItem[] for forecast valid times from the latest init_time
 * through init + max lead_time.
 */
export function generateValidTimeDates(
  initTimes: Float64Array,
  leadTimes: Float64Array,
  generateDefaultDateItem: (date: number) => DateItem,
): DateItem[] {
  if (initTimes.length === 0 || leadTimes.length === 0) {
    return [];
  }

  const latestInitSec = initTimes[initTimes.length - 1]!;
  const maxLeadSec = leadTimes[leadTimes.length - 1]!;
  return buildDailyDateItems(
    latestInitSec * 1000,
    (latestInitSec + maxLeadSec) * 1000,
    generateDefaultDateItem,
  );
}
