/**
 * Map Dimensions Utilities
 *
 * This module handles dimension calculations for map exports.
 *
 * All map exports use aspect ratio controls to determine dimensions.
 * The aspect ratio is auto-initialized based on the geographic bounding box
 * but can be locked to presets by the user to fit their needs.
 */

import { AspectRatio } from 'components/MapExport/types';

/**
 * All available aspect ratios with their decimal values
 */
const ASPECT_RATIOS: { ratio: AspectRatio; decimal: number }[] = [
  { ratio: '3:2', decimal: 1.5 },
  { ratio: '4:3', decimal: 1.333 },
  { ratio: '6:5', decimal: 1.2 },
  { ratio: '1:1', decimal: 1.0 },
  { ratio: '2:3', decimal: 0.667 },
];

const LANDSCAPE_RATIOS: AspectRatio[] = ['4:3', '3:2', '6:5'];

/**
 * Calculates the recommended aspect ratio based on a geographic bounding box.
 * Also returns a filtered set of options (3 choices: one landscape, square, one portrait).
 *
 * @param boundingBox - Array of [west, south, east, north] coordinates
 * @returns Object with recommended aspect ratio and filtered options
 */
export function getRecommendedAspectRatio(boundingBox: number[]): {
  recommended: AspectRatio;
  options: AspectRatio[];
} {
  const [west, south, east, north] = boundingBox;
  const width = east - west;
  const height = north - south;
  const naturalRatio = width / height;

  // Find the closest matching aspect ratio
  let closestRatio = ASPECT_RATIOS[0];
  let smallestDiff = Math.abs(naturalRatio - closestRatio.decimal);

  ASPECT_RATIOS.forEach(ar => {
    const diff = Math.abs(naturalRatio - ar.decimal);
    if (diff < smallestDiff) {
      smallestDiff = diff; // eslint-disable-line fp/no-mutation
      closestRatio = ar; // eslint-disable-line fp/no-mutation
    }
  });

  const recommended = closestRatio.ratio;

  // Determine filtered options based on whether closest match is landscape or portrait
  const options = LANDSCAPE_RATIOS.includes(recommended)
    ? ([recommended, '1:1', '2:3'] as AspectRatio[])
    : (['3:2', '1:1', '2:3'] as AspectRatio[]);

  return { recommended, options };
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
 * @param aspectRatio - The aspect ratio string (e.g., "2:3")
 * @returns Export dimensions with viewport and map percentage values
 */
export function calculateExportDimensions(
  aspectRatio: AspectRatio,
): ExportDimensions {
  const [w, h] = aspectRatio.split(':').map(Number);
  const ratioValue = w / h;

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
