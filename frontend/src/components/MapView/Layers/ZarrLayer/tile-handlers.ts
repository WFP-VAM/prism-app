import type { GetTileDataOptions } from '@developmentseed/deck.gl-zarr';
import { createLegendGpuPipeline } from 'components/MapView/Layers/raster-gpu-pipeline';
import type { LegendDefinition } from 'config/types';
import { IcechunkStore } from 'icechunk-js';
import * as zarr from 'zarrita';

import { toFloat64Array } from './georef';

export interface ZarrRenderConfig {
  legend: LegendDefinition;
  minValue: number;
  maxValue: number;
  scaleFactor: number;
  addOffset: number;
  valueScale: number;
  fillValue: number | undefined;
  reduceEnsemble: boolean;
}

function isValidSample(value: number, fillValue: number | undefined): boolean {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return false;
  }
  if (fillValue !== undefined && value === fillValue) {
    return false;
  }
  return true;
}

function toFloat32TileData(
  result: unknown,
  width: number,
  height: number,
  config: ZarrRenderConfig,
): Float32Array {
  const expectedLength = width * height;
  const raw = toFloat64Array(result);
  const { scaleFactor, addOffset, valueScale, fillValue } = config;
  const out = new Float32Array(expectedLength);

  for (let i = 0; i < expectedLength; i++) {
    const value = raw[i] ?? NaN;
    if (!isValidSample(value, fillValue)) {
      out[i] = NaN;
      continue;
    }
    out[i] = (value * scaleFactor + addOffset) * valueScale;
  }

  return out;
}

function toFloat32EnsembleMeanTileData(
  result: unknown,
  width: number,
  height: number,
  config: ZarrRenderConfig,
): Float32Array {
  const hw = width * height;
  const raw = toFloat64Array(result);
  const { scaleFactor, addOffset, valueScale, fillValue } = config;
  const out = new Float32Array(hw);

  if (hw === 0 || raw.length === 0) {
    return out;
  }

  const ensembleSize = Math.round(raw.length / hw);
  if (ensembleSize <= 0 || raw.length % hw !== 0) {
    throw new Error(
      `Ensemble tile size mismatch: expected multiple of ${hw} values, got ${raw.length}`,
    );
  }

  for (let p = 0; p < hw; p++) {
    let sum = 0;
    let count = 0;
    for (let e = 0; e < ensembleSize; e++) {
      const value = raw[e * hw + p] ?? NaN;
      if (!isValidSample(value, fillValue)) {
        continue;
      }
      sum += value;
      count += 1;
    }
    if (count === 0) {
      out[p] = NaN;
    } else {
      out[p] = ((sum / count) * scaleFactor + addOffset) * valueScale;
    }
  }

  return out;
}

export function createZarrTileHandlers(config: ZarrRenderConfig) {
  const {
    fillValue,
    scaleFactor,
    addOffset,
    valueScale,
    legend,
    minValue,
    maxValue,
    reduceEnsemble,
  } = config;

  const pipeline = createLegendGpuPipeline({
    legend,
    minValue,
    maxValue,
    getNodata: () =>
      fillValue !== undefined
        ? (fillValue * scaleFactor + addOffset) * valueScale
        : null,
  });

  const getTileData = async (
    arr: zarr.Array<zarr.DataType, IcechunkStore>,
    options: GetTileDataOptions,
  ) => {
    const { device, sliceSpec, width, height, signal } = options;
    const result = await zarr.get(arr, sliceSpec, { signal });
    const floatData = reduceEnsemble
      ? toFloat32EnsembleMeanTileData(result, width, height, config)
      : toFloat32TileData(result, width, height, config);
    return pipeline.uploadTile(device, floatData, width, height);
  };

  return { getTileData, renderTile: pipeline.renderTile };
}
