import { IcechunkStore } from 'icechunk-js';
import * as zarr from 'zarrita';

import type { ZarrDatasetCoords } from './georef';
import { snapToNearestTimeIndex } from './georef';
import type { GeoZarrMetadataAttrs } from './geozarr-shim';
import { buildGeoZarrMetadata, readCoordValues } from './geozarr-shim';

export interface ZarrVariableMeta {
  shape: number[];
  chunks: number[];
  dims: string[];
  dtype: string;
  fillValue: number | undefined;
  scaleFactor: number;
  addOffset: number;
  units: string | undefined;
}

export interface OpenZarrDataset {
  repoUrl: string;
  snapshotId: string;
  variable: string;
  meta: ZarrVariableMeta;
  coords: ZarrDatasetCoords;
  /** Opened variable array (passed to deck.gl-zarr as `node`). */
  varArray: zarr.Array<zarr.DataType, IcechunkStore>;
  /** Synthetic GeoZarr attrs for datasets without native conventions. */
  geozarrMetadata: GeoZarrMetadataAttrs;
  /** Name of the non-spatial time dimension (for `selection`). */
  timeDim: string;
}

interface CacheEntry {
  dataset: OpenZarrDataset;
  store: IcechunkStore;
}

const datasetCache = new Map<string, CacheEntry>();

function cacheKey(repoUrl: string, variable: string): string {
  return `${repoUrl}::${variable}`;
}

async function readCoordArray(
  store: IcechunkStore,
  name: string,
): Promise<Float64Array> {
  const arr = await zarr.open(store.resolve(name), { kind: 'array' });
  const result = await zarr.get(arr);
  return readCoordValues(result);
}

function parseFillValue(attrs: Record<string, unknown>): number | undefined {
  const raw = attrs._FillValue ?? attrs.missing_value;
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const num = Number(raw);
  return Number.isNaN(num) ? undefined : num;
}

function resolveTimeDim(dims: string[]): string {
  const timeDim = dims.find(
    dim =>
      dim === 'time' ||
      dim === 'init_time' ||
      dim === 'valid_time' ||
      dim === 'lead_time',
  );
  if (!timeDim) {
    throw new Error(
      `Zarr variable has no time dimension; dims=${JSON.stringify(dims)}`,
    );
  }
  return timeDim;
}

/** Open an Icechunk repo, pin snapshot, and read variable metadata + coordinates. */
export async function openZarrDataset(
  repoUrl: string,
  variable: string,
): Promise<OpenZarrDataset> {
  const key = cacheKey(repoUrl, variable);
  const cached = datasetCache.get(key);
  if (cached) {
    return cached.dataset;
  }

  const store = await IcechunkStore.open(repoUrl);
  const snapshotId = String(store.session.getSnapshotId());

  const varArray = await zarr.open(store.resolve(variable), { kind: 'array' });
  const attrs = (varArray.attrs ?? {}) as Record<string, unknown>;

  const dims = (varArray.dimensionNames ?? [
    'time',
    'latitude',
    'longitude',
  ]) as string[];

  const meta: ZarrVariableMeta = {
    shape: [...varArray.shape],
    chunks: [...(varArray.chunks ?? varArray.shape)],
    dims,
    dtype: String(varArray.dtype),
    fillValue: parseFillValue(attrs),
    scaleFactor: Number(attrs.scale_factor ?? 1),
    addOffset: Number(attrs.add_offset ?? 0),
    units: attrs.units as string | undefined,
  };

  const timeDim = resolveTimeDim(dims);
  const latDim =
    dims.find(dim => dim === 'latitude' || dim === 'lat') ?? 'latitude';
  const lonDim =
    dims.find(dim => dim === 'longitude' || dim === 'lon') ?? 'longitude';

  const times = await readCoordArray(store, timeDim);
  const lats = await readCoordArray(store, latDim);
  const lons = await readCoordArray(store, lonDim);

  const geozarrMetadata = buildGeoZarrMetadata(dims, lats, lons);

  const dataset: OpenZarrDataset = {
    repoUrl,
    snapshotId,
    variable,
    meta,
    coords: { times, lats, lons },
    varArray,
    geozarrMetadata,
    timeDim,
  };

  datasetCache.set(key, { dataset, store });
  return dataset;
}

export function resolveTimeIndex(
  dataset: OpenZarrDataset,
  selectedDateMs: number,
): number {
  return snapToNearestTimeIndex(dataset.coords.times, selectedDateMs);
}

export function clearZarrDatasetCache(): void {
  datasetCache.clear();
}
