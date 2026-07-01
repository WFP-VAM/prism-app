import type {
  RasterModule,
  RenderTileResult,
} from '@developmentseed/deck.gl-raster';
import {
  Colormap,
  createColormapTexture,
  CreateTexture,
  FilterNoDataVal,
  LinearRescale,
} from '@developmentseed/deck.gl-raster/gpu-modules';
import type { Device, Texture } from '@luma.gl/core';
import type { LegendDefinition } from 'config/types';

import { buildColormapImageData } from './raster-colormap';

export type RasterTileData = {
  width: number;
  height: number;
  texture: Texture;
  byteLength: number;
};

export interface LegendGpuPipelineConfig {
  legend: LegendDefinition;
  minValue: number;
  maxValue: number;
  /** Nodata/fill in display units (after scale/offset). Null/undefined skips FilterNoDataVal. */
  getNodata: () => number | null | undefined;
}

export function createLegendGpuPipeline(config: LegendGpuPipelineConfig) {
  let colormapTex: Texture | null = null;

  const uploadTile = (
    device: Device,
    floatData: Float32Array,
    width: number,
    height: number,
  ): RasterTileData => {
    const texture = device.createTexture({
      data: floatData,
      format: 'r32float',
      width,
      height,
      sampler: { minFilter: 'nearest', magFilter: 'nearest' },
    });

    if (!colormapTex) {
      colormapTex = createColormapTexture(
        device,
        buildColormapImageData(config.legend, config.maxValue),
      );
    }

    return {
      texture,
      width,
      height,
      byteLength: floatData.byteLength,
    };
  };

  const renderTile = (tileData: RasterTileData): RenderTileResult => {
    const nodata = config.getNodata();
    const pipeline: RasterModule[] = [
      { module: CreateTexture, props: { textureName: tileData.texture } },
      ...(nodata !== null && nodata !== undefined
        ? [{ module: FilterNoDataVal, props: { value: nodata } }]
        : []),
      {
        module: LinearRescale,
        props: {
          rescaleMin: config.minValue,
          rescaleMax: config.maxValue,
        },
      },
      ...(colormapTex
        ? [
            {
              module: Colormap,
              props: { colormapTexture: colormapTex, colormapIndex: 0 },
            },
          ]
        : []),
    ];
    return { renderPipeline: pipeline };
  };

  return { uploadTile, renderTile };
}
