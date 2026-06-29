import { IcechunkStore } from 'icechunk-js';
import * as zarr from 'zarrita';

import type { ZarrDatasetCoords } from './georef';
import { snapToNearestTimeIndex } from './georef';
import type { GeoZarrMetadataAttrs } from './geozarr-shim';
import { buildGeoZarrMetadata, readCoordValues } from './geozarr-shim';

export type ZarrDatasetMode = 'analysis' | 'forecast';

export interface OpenZarrDatasetOptions {
  mode: ZarrDatasetMode;
  ensemble?: boolean;
  initTimeDim?: string;
  leadTimeDim?: string;
  ensembleDim?: string;
}

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
  mode: ZarrDatasetMode;
  ensemble: boolean;
  /** Name of the non-spatial time dimension (for `selection` in analysis mode). */
  timeDim: string;
  initTimeDim?: string;
  leadTimeDim?: string;
  ensembleDim?: string;
  initTimes?: Float64Array;
  leadTimes?: Float64Array;
  ensembleSize?: number;
}

interface CacheEntry {
  dataset: OpenZarrDataset;
  store: IcechunkStore;
}

const datasetCache = new Map<string, CacheEntry>();

const DEFAULT_INIT_TIME_DIM = 'init_time';
const DEFAULT_LEAD_TIME_DIM = 'lead_time';
const DEFAULT_ENSEMBLE_DIM = 'ensemble_member';

function cacheKey(
  repoUrl: string,
  variable: string,
  options: OpenZarrDatasetOptions,
): string {
  return `${repoUrl}::${variable}::${options.mode}::${options.ensemble ?? false}`;
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

function requireDim(dims: string[], dimName: string, variable: string): number {
  const index = dims.indexOf(dimName);
  if (index === -1) {
    throw new Error(
      `Zarr variable "${variable}" is missing configured dimension "${dimName}"; dims=${JSON.stringify(dims)}`,
    );
  }
  return index;
}

/** Open an Icechunk repo, pin snapshot, and read variable metadata + coordinates. */
export async function openZarrDataset(
  repoUrl: string,
  variable: string,
  options: OpenZarrDatasetOptions = { mode: 'analysis' },
): Promise<OpenZarrDataset> {
  const key = cacheKey(repoUrl, variable, options);
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

  const latDim =
    dims.find(dim => dim === 'latitude' || dim === 'lat') ?? 'latitude';
  const lonDim =
    dims.find(dim => dim === 'longitude' || dim === 'lon') ?? 'longitude';

  const lats = await readCoordArray(store, latDim);
  const lons = await readCoordArray(store, lonDim);
  const geozarrMetadata = buildGeoZarrMetadata(dims, lats, lons);

  if (options.mode === 'forecast') {
    const initTimeDim = options.initTimeDim ?? DEFAULT_INIT_TIME_DIM;
    const leadTimeDim = options.leadTimeDim ?? DEFAULT_LEAD_TIME_DIM;
    const ensembleDim = options.ensembleDim ?? DEFAULT_ENSEMBLE_DIM;

    requireDim(dims, initTimeDim, variable);
    requireDim(dims, leadTimeDim, variable);

    const initTimes = await readCoordArray(store, initTimeDim);
    const leadTimes = await readCoordArray(store, leadTimeDim);

    let ensembleSize: number | undefined;
    if (options.ensemble) {
      const ensembleIndex = requireDim(dims, ensembleDim, variable);
      ensembleSize = varArray.shape[ensembleIndex];
    }

    const dataset: OpenZarrDataset = {
      repoUrl,
      snapshotId,
      variable,
      meta,
      coords: { times: initTimes, lats, lons },
      varArray,
      geozarrMetadata,
      mode: 'forecast',
      ensemble: options.ensemble ?? false,
      timeDim: initTimeDim,
      initTimeDim,
      leadTimeDim,
      ensembleDim: options.ensemble ? ensembleDim : undefined,
      initTimes,
      leadTimes,
      ensembleSize,
    };

    datasetCache.set(key, { dataset, store });
    return dataset;
  }

  const timeDim = resolveTimeDim(dims);
  const times = await readCoordArray(store, timeDim);

  const dataset: OpenZarrDataset = {
    repoUrl,
    snapshotId,
    variable,
    meta,
    coords: { times, lats, lons },
    varArray,
    geozarrMetadata,
    mode: 'analysis',
    ensemble: false,
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

/** Pin latest init_time, nearest lead_time for valid time; keep full ensemble axis when ensemble. */
export function resolveForecastSelection(
  dataset: OpenZarrDataset,
  selectedDateMs: number,
): Record<string, number | null> {
  if (dataset.mode !== 'forecast') {
    throw new Error('resolveForecastSelection requires forecast mode dataset');
  }

  const {
    initTimes,
    leadTimes,
    initTimeDim,
    leadTimeDim,
    ensemble,
    ensembleDim,
  } = dataset;

  if (
    !initTimes ||
    !leadTimes ||
    !initTimeDim ||
    !leadTimeDim ||
    initTimes.length === 0 ||
    leadTimes.length === 0
  ) {
    throw new Error(
      'Forecast dataset is missing init_time or lead_time coords',
    );
  }

  const latestIdx = initTimes.length - 1;
  const initSec = initTimes[latestIdx]!;
  const targetSec = selectedDateMs / 1000;

  let bestLeadIdx = 0;
  let bestDiff = Infinity;
  for (let j = 0; j < leadTimes.length; j++) {
    const validSec = initSec + leadTimes[j]!;
    const diff = Math.abs(validSec - targetSec);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLeadIdx = j;
    }
  }

  const selection: Record<string, number | null> = {
    [initTimeDim]: latestIdx,
    [leadTimeDim]: bestLeadIdx,
  };

  if (ensemble && ensembleDim) {
    selection[ensembleDim] = null;
  }

  return selection;
}

export function clearZarrDatasetCache(): void {
  datasetCache.clear();
}
