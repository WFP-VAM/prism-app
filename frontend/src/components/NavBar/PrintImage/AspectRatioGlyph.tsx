import { AspectRatio, isCustomRatio } from 'components/MapExport/types';
import { getAspectRatioDecimal } from 'components/MapExport/aspectRatioConstants';

interface AspectRatioGlyphProps {
  aspectRatio: AspectRatio;
  size?: number;
}

/**
 * Resolves aspect ratio to a numeric value for rendering the glyph
 */
function getAspectRatioValue(aspectRatio: AspectRatio): number {
  if (aspectRatio === 'Auto') {
    return 1.5; // Default landscape for visual representation
  }

  if (isCustomRatio(aspectRatio)) {
    return aspectRatio.w / aspectRatio.h;
  }

  // Use the centralized resolver for preset ratios
  return getAspectRatioDecimal(aspectRatio);
}

/**
 * Visual glyph component that renders a proportional rectangle
 * representing the aspect ratio
 */
export function AspectRatioGlyph({
  aspectRatio,
  size = 20,
}: AspectRatioGlyphProps) {
  const ratio = getAspectRatioValue(aspectRatio);
  const isPortrait = ratio < 1;

  // Calculate rectangle dimensions to fit within the viewBox
  const maxDimension = size * 0.8;
  const rectWidth = isPortrait ? maxDimension * ratio : maxDimension;
  const rectHeight = isPortrait ? maxDimension : maxDimension / ratio;

  // Center the rectangle in the viewBox
  const x = (size - rectWidth) / 2;
  const y = (size - rectHeight) / 2;

  const strokeDasharray = aspectRatio === 'Auto' ? '2,1' : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
    >
      <rect
        x={x}
        y={y}
        rx={2}
        width={rectWidth}
        height={rectHeight}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={strokeDasharray}
      />
    </svg>
  );
}

export default AspectRatioGlyph;
