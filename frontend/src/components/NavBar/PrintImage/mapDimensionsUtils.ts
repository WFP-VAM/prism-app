/**
 * Map Dimensions Utilities
 *
 * This module handles dimension calculations for map exports.
 *
 * All map exports use aspect ratio controls to determine dimensions.
 * The aspect ratio is auto-initialized based on the geographic bounding box
 * but can be locked to presets by the user to fit their needs.
 */

import {
  AspectRatio,
  isAutoRatio,
  isCustomRatio,
} from 'components/MapExport/types';

/**
 * All available aspect ratios with their decimal values
 */
const ASPECT_RATIOS: {
  ratio: Exclude<AspectRatio, 'Auto' | { w: number; h: number }>;
  decimal: number;
}[] = [
  { ratio: '3:2', decimal: 1.5 },
  { ratio: 'A4-L', decimal: 1.414 },
  { ratio: '4:3', decimal: 1.333 },
  { ratio: '6:5', decimal: 1.2 },
  { ratio: '1:1', decimal: 1.0 },
  { ratio: 'A4-P', decimal: 0.707 },
  { ratio: '2:3', decimal: 2 / 3 },
];

/**
 * Lookup map for quick aspect ratio resolution
 */
const ASPECT_RATIO_MAP = new Map(
  ASPECT_RATIOS.map(({ ratio, decimal }) => [ratio, decimal]),
);

/**
 * Resolves an aspect ratio to its numeric value.
 * Handles Auto, Custom, and preset ratios using the ASPECT_RATIOS constant.
 *
 * @param aspectRatio - The aspect ratio type
 * @param autoWidth - Width for Auto mode (required when aspectRatio is 'Auto')
 * @param autoHeight - Height for Auto mode (required when aspectRatio is 'Auto')
 * @returns The numeric aspect ratio value (width / height)
 */
export function resolveAspectRatioValue(
  aspectRatio: AspectRatio,
  autoWidth?: number,
  autoHeight?: number,
): number {
  // Handle Auto mode
  if (isAutoRatio(aspectRatio)) {
    if (autoWidth && autoHeight) {
      return autoWidth / autoHeight;
    }
    throw new Error('Auto aspect ratio requires autoWidth and autoHeight');
  }

  if (isCustomRatio(aspectRatio)) {
    if (aspectRatio.w <= 0 || aspectRatio.h <= 0) {
      throw new Error('Custom aspect ratio requires positive w and h values');
    }
    return aspectRatio.w / aspectRatio.h;
  }

  // Look up preset ratios from constant
  const decimal = ASPECT_RATIO_MAP.get(aspectRatio);
  if (decimal === undefined) {
    throw new Error(`Unknown aspect ratio: ${aspectRatio}`);
  }
  return decimal;
}

export interface ExportDimensions {
  canvasWidth: number; // pixels
  canvasHeight: number; // pixels
  mapWidthPercent: number; // percentage of canvas (always ≤ 100)
  mapHeightPercent: number; // percentage of canvas (always ≤ 100)
  isPortrait: boolean;
}

/**
 * Calculates export dimensions based on aspect ratio.
 * Returns viewport dimensions and map percentages for rendering.
 *
 * The map always fills 100% of the viewport, and the viewport dimensions
 * are calculated to maintain the specified aspect ratio.
 *
 * @param aspectRatio - The aspect ratio (string or {w, h} object)
 * @param autoWidth - Optional width (used when aspectRatio is 'Auto')
 * @param autoHeight - Optional height (used when aspectRatio is 'Auto')
 * @returns Export dimensions with viewport and map percentage values
 */
export function calculateExportDimensions(
  aspectRatio: AspectRatio,
  autoWidth?: number,
  autoHeight?: number,
): ExportDimensions {
  const ratioValue = resolveAspectRatioValue(
    aspectRatio,
    autoWidth,
    autoHeight,
  );

  const baseWidth = 1200;
  const canvasHeight = Math.round(baseWidth / ratioValue);

  return {
    canvasWidth: baseWidth,
    canvasHeight,
    mapWidthPercent: 100,
    mapHeightPercent: 100,
    isPortrait: ratioValue < 1,
  };
}
