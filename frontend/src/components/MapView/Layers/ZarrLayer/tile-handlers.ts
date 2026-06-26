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
  fillValue: number | undefined;
}

function toFloat32TileData(
  result: unknown,
  width: number,
  height: number,
  config: ZarrRenderConfig,
): Float32Array {
  const expectedLength = width * height;
  const raw = toFloat64Array(result);
  const { scaleFactor, addOffset } = config;
  const out = new Float32Array(expectedLength);

  for (let i = 0; i < expectedLength; i++) {
    const value = raw[i] ?? NaN;
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      out[i] = NaN;
      continue;
    }
    out[i] = value * scaleFactor + addOffset;
  }

  return out;
}

export function createZarrTileHandlers(config: ZarrRenderConfig) {
  const { fillValue, scaleFactor, addOffset, legend, minValue, maxValue } =
    config;

  const pipeline = createLegendGpuPipeline({
    legend,
    minValue,
    maxValue,
    getNodata: () =>
      fillValue !== undefined ? fillValue * scaleFactor + addOffset : null,
  });

  const getTileData = async (
    arr: zarr.Array<zarr.DataType, IcechunkStore>,
    options: GetTileDataOptions,
  ) => {
    const { device, sliceSpec, width, height, signal } = options;
    const result = await zarr.get(arr, sliceSpec, { signal });
    const floatData = toFloat32TileData(result, width, height, config);
    return pipeline.uploadTile(device, floatData, width, height);
  };

  return { getTileData, renderTile: pipeline.renderTile };
}
