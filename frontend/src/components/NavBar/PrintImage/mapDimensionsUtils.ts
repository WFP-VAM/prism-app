/**
 * Map Dimensions Utilities
 *
 * This module handles dimension calculations for map exports.
 *
 * ============================================================================
 * RULES FOR ASPECT RATIO AND MAP WIDTH
 * ============================================================================
 *
 * SINGLE MAP DOWNLOAD (Aspect Ratio DISABLED):
 * - User can select any width from 50% to 100%
 * - Width represents percentage of browser viewport
 * - No A4 constraints - map fills available space
 * - Aspect ratio is determined by viewport/browser size
 *
 * BATCH MAPS / LOCKED ASPECT RATIO (Aspect Ratio ENABLED):
 * - Width options limited to 50% and 100%
 * - Map is rendered on A4 paper canvas (white background, gray backdrop)
 * - A4 orientation determined by aspect ratio + width:
 *   - PORTRAIT A4: aspect ratio is portrait (2:3) AND width = 100%
 *   - LANDSCAPE A4: all other cases
 *
 * Width = 100%:
 * - Map takes maximum size while fitting within A4 bounds
 * - Portrait ratios: map fills A4 height, width is constrained
 * - Landscape ratios: map fills A4 width, height is constrained
 *
 * Width = 50%:
 * - Map is same size as at 100% but positioned on left half of A4
 * - Right half is blank (useful for notes/comparisons)
 * - Always uses LANDSCAPE A4 orientation
 *
 * Why no 60-90% options?
 * - For portrait-ratio countries (like Mozambique), the map is height-constrained
 * - This means 50%, 70%, 90% all result in the same visual appearance
 * - Offering these options creates confusion without functional benefit
 *
 * ============================================================================
 */

import { AspectRatio } from 'components/MapExport/types';
import { MapDimensions } from './printConfig.context';

// A4 ratio ≈ 1.414 (297mm / 210mm)
const A4_RATIO = 1.414;
// Base width for exports in pixels
const BASE_WIDTH = 1200;

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

/**
 * Calculates new map dimensions.
 * Width and aspect ratio are independent - width is set directly,
 * and height is calculated from the aspect ratio (not constrained).
 *
 * @param currentDimensions - Current map dimensions
 * @param options - Configuration options
 * @param options.newWidth - Optional new width value
 * @param options.newAspectRatio - Optional new aspect ratio value
 * @returns New map dimensions object
 */
export function calculateMapDimensions(
  currentDimensions: MapDimensions,
  options: {
    newWidth?: number;
    newAspectRatio?: AspectRatio;
  },
): MapDimensions {
  const { newWidth, newAspectRatio } = options;
  const width = newWidth ?? currentDimensions.width;
  const aspectRatio = newAspectRatio ?? currentDimensions.aspectRatio;
  const [w, h] = aspectRatio.split(':').map(Number);

  // Calculate height from width and aspect ratio (not constrained to 100%)
  const calculatedHeight = Math.round((width * h) / w);

  return {
    ...currentDimensions,
    width,
    height: calculatedHeight,
    aspectRatio,
  };
}

export interface ExportDimensions {
  canvasWidth: number; // pixels
  canvasHeight: number; // pixels
  mapWidthPercent: number; // percentage of canvas (always ≤ 100)
  mapHeightPercent: number; // percentage of canvas (always ≤ 100)
  isPortrait: boolean;
}

/**
 * Calculates export dimensions with A4-based constraints.
 * Returns viewport dimensions and map percentages for correct rendering.
 *
 * Page orientation logic:
 * - Portrait A4: aspect ratio is portrait (h > w) AND width = 100%
 * - Landscape A4: aspect ratio is landscape OR width < 100%
 *
 * Width setting behavior:
 * - 100%: Map fills A4 height, viewport = map dimensions
 * - 50%: A4 paper with map on left, blank on right, viewport = A4 dimensions
 *
 * @param aspectRatio - The aspect ratio string (e.g., "2:3")
 * @param mapWidthSetting - The user's width setting (50 or 100%)
 * @returns Export dimensions with viewport and map percentage values
 */
export function calculateExportDimensions(
  aspectRatio: AspectRatio,
  mapWidthSetting: number,
): ExportDimensions {
  const [w, h] = aspectRatio.split(':').map(Number);
  const ratioValue = w / h; // e.g., 0.667 for 2:3 portrait

  // Determine page orientation
  // Portrait A4: aspect ratio is portrait (h > w) AND width = 100%
  const isPortraitRatio = ratioValue < 1;
  const isPortrait = isPortraitRatio && mapWidthSetting === 100;

  // Calculate A4 paper dimensions in pixels
  const a4Width = BASE_WIDTH;
  const a4Height = Math.round(
    isPortrait ? BASE_WIDTH * A4_RATIO : BASE_WIDTH / A4_RATIO,
  );

  // Calculate map dimensions that fit within A4 while maintaining aspect ratio
  // Map fills A4 height, width is determined by aspect ratio
  const mapHeightPx = a4Height;
  const mapWidthPx = Math.round(a4Height * ratioValue);

  // Calculate map width as percentage of A4 paper
  const mapWidthPercentOfA4 = (mapWidthPx / a4Width) * 100;

  // For 100% width: viewport = map dimensions (map fills viewport)
  // For 50% width: viewport = A4 dimensions (captures paper with blank space)
  const is50Percent = mapWidthSetting === 50;

  return {
    canvasWidth: is50Percent ? a4Width : mapWidthPx,
    canvasHeight: is50Percent ? a4Height : mapHeightPx,
    // Map percentages for ExportView to use
    // At 50%: use calculated percentage that maintains aspect ratio within A4
    // At 100%: map fills viewport (which is sized to map dimensions)
    mapWidthPercent: is50Percent
      ? Math.round(mapWidthPercentOfA4 * 100) / 100
      : 100,
    mapHeightPercent: 100, // Map always fills height
    isPortrait,
  };
}
