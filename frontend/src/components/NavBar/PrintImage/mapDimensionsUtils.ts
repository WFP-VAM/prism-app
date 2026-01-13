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
  getAspectRatioDecimal,
} from 'components/MapExport/aspectRatioConstants';

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
  const ratioValue = getAspectRatioDecimal(aspectRatio, autoWidth, autoHeight);

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
