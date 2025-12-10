import { AspectRatio } from 'components/MapExport/types';
import { MapDimensions } from './printConfig.context';

/**
 * Calculates new map dimensions ensuring height doesn't exceed 100%.
 * If the calculated height would exceed 100%, it snaps to the largest valid width
 * that keeps height <= 100%.
 *
 * @param currentDimensions - Current map dimensions
 * @param options - Configuration options
 * @param options.newWidth - Optional new width value
 * @param options.newAspectRatio - Optional new aspect ratio value
 * @param options.availableWidths - Array of available width options
 * @returns New map dimensions object
 */
export function calculateMapDimensions(
  currentDimensions: MapDimensions,
  options: {
    newWidth?: number;
    newAspectRatio?: AspectRatio;
    availableWidths: number[];
  },
): MapDimensions {
  const { newWidth, newAspectRatio, availableWidths } = options;
  const width = newWidth ?? currentDimensions.width;
  const aspectRatio = newAspectRatio ?? currentDimensions.aspectRatio;

  const [w, h] = aspectRatio.split(':').map(Number);
  const calculatedHeight = Math.round((width * h) / w);

  // If height exceeds 100%, snap to nearest width that keeps height <= 100%
  if (calculatedHeight > 100) {
    // Find all widths that would keep height <= 100%
    const validOptions = availableWidths.filter(
      validWidth => Math.round((validWidth * h) / w) <= 100,
    );
    // Choose the largest valid option (closest to what user wanted)
    const snappedWidth =
      validOptions.length > 0 ? Math.max(...validOptions) : availableWidths[0]; // Fallback to smallest if none work

    return {
      ...currentDimensions,
      width: snappedWidth,
      height: Math.round((snappedWidth * h) / w),
      ...(newAspectRatio && { aspectRatio: newAspectRatio }),
    };
  }

  return {
    ...currentDimensions,
    width,
    height: calculatedHeight,
    ...(newAspectRatio && { aspectRatio: newAspectRatio }),
  };
}
