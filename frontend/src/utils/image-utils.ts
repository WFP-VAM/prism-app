import { LocalError } from './error-utils';

interface SVGToImageSettings {
  // The svg string node
  svg: Node | string;
  // Usually all SVG have transparency, so PNG is the way to go by default
  mimeType: 'image/png' | 'image/jpeg';
  quality: number;
  width: number | 'auto';
  height: number | 'auto';
  outputFormat: 'base64' | 'blob';
}

const createSvgNode = (svg: Node | string): Node | string | null => {
  // Create SVG Node if a plain string has been provided
  if (typeof svg === 'string') {
    // Create a non-visible node to render the SVG string
    const SVGContainer = document.createElement('div');

    SVGContainer.style.display = 'none';

    SVGContainer.innerHTML = svg;

    return SVGContainer.firstElementChild;
  }
  return svg;
};

const calculateImageWidth = (
  width: number | 'auto',
  height: number | 'auto',
  image: HTMLImageElement,
): number => {
  // Calculate width if set to auto and the height is specified (to preserve aspect ratio)
  if (width === 'auto' && height !== 'auto') {
    return (image.width / image.height) * height;
  }
  // Use image original width
  if (width === 'auto') {
    return image.naturalWidth;
  }
  // Use custom width
  return width;
};

const calculateImageHeight = (
  width: number | 'auto',
  height: number | 'auto',
  image: HTMLImageElement,
): number => {
  // Calculate height if set to auto and the width is specified (to preserve aspect ratio)
  if (height === 'auto' && width !== 'auto') {
    return (image.height / image.width) * width;
  }
  // Use image original height
  if (height === 'auto') {
    return image.naturalHeight;
  }
  // Use custom height
  return height;
};

/**
 * Simple function that converts a plain SVG string or SVG DOM Node into an image with custom dimensions.
 *
 * @param {SVGToImageSettings} settings The configuration object to override the default settings.
 * @see https://ourcodeworld.com/articles/read/1456/how-to-convert-a-plain-svg-string-or-svg-node-to-an-image-png-or-jpeg-in-the-browser-with-javascript
 * @returns {Promise<string | Blob>}
 */
const SVGToImage = (settings: SVGToImageSettings): Promise<string | Blob> =>
  new Promise<string | Blob>(resolve => {
    const svgNode = createSvgNode(settings.svg);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const svgXml = new XMLSerializer().serializeToString(svgNode as Node);
    const svgBase64 = `data:image/svg+xml;base64,${window.btoa(svgXml)}`;

    const image = new Image();

    image.onload = () => {
      const finalWidth = calculateImageWidth(
        settings.width,
        settings.height,
        image,
      );

      const finalHeight = calculateImageHeight(
        settings.width,
        settings.height,
        image,
      );

      // Define the canvas intrinsic size

      canvas.width = finalWidth;

      canvas.height = finalHeight;

      if (!context) {
        throw new LocalError('Canvas Context is null');
      }

      // Render image in the canvas
      context.drawImage(image, 0, 0, finalWidth, finalHeight);

      if (settings.outputFormat === 'blob') {
        // Fulfill and Return the Blob image
        canvas.toBlob(
          blob => {
            resolve(blob as Blob);
          },
          settings.mimeType,
          settings.quality,
        );
      } else {
        // Fulfill and Return the Base64 image
        resolve(canvas.toDataURL(settings.mimeType, settings.quality));
      }
    };

    // Load the SVG in Base64 to the image

    image.src = svgBase64;
  });

export const convertSvgToPngBase64Image = async (
  svg: Node | string,
  width: number | 'auto' = 'auto',
  height: number | 'auto' = 'auto',
  quality = 0.92,
): Promise<string> => {
  try {
    const base64Image = await SVGToImage({
      svg,
      quality,
      width,
      height,
      mimeType: 'image/png',
      outputFormat: 'base64',
    });
    return base64Image as string;
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    throw error;
  }
};

export const convertSvgToPngBaseBlobImage = async (
  svg: Node | string,
  width: number | 'auto' = 'auto',
  height: number | 'auto' = 'auto',
  quality = 0.92,
): Promise<Blob> => {
  try {
    const blobImage = await SVGToImage({
      svg,
      quality,
      width,
      height,
      mimeType: 'image/png',
      outputFormat: 'blob',
    });
    return blobImage as Blob;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Original Illustrator hatch had 19 lines ~11 units apart; stride 3 ≈ 33 units (~3× spacing).
const HATCH_LINE_STRIDE = 3;
const PATTERN_SIZE = 100;

const LEFT_DIAGONAL_LINES: Array<[number, number, number, number]> = [
  [153.03, 53.03, 46.97, -53.03],
  [147.48, 58.59, 41.41, -47.48],
  [141.92, 64.14, 35.86, -41.92],
  [136.37, 69.7, 30.3, -36.37],
  [130.81, 75.26, 24.74, -30.81],
  [125.26, 80.81, 19.19, -25.26],
  [119.7, 86.37, 13.63, -19.7],
  [114.14, 91.92, 8.08, -14.14],
  [108.59, 97.48, 2.52, -8.59],
  [103.03, 103.03, -3.03, -3.03],
  [97.48, 108.59, -8.59, 2.52],
  [91.92, 114.14, -14.14, 8.08],
  [86.37, 119.7, -19.7, 13.63],
  [80.81, 125.26, -25.26, 19.19],
  [75.26, 130.81, -30.81, 24.74],
  [69.7, 136.37, -36.37, 30.3],
  [64.14, 141.92, -41.92, 35.86],
  [58.59, 147.48, -47.48, 41.41],
  [53.03, 153.03, -53.03, 46.97],
];

const subsampledHatchLines = (lines: Array<[number, number, number, number]>) =>
  lines.filter((_, index) => index % HATCH_LINE_STRIDE === 0);

/** Mirror working \ lines to / — same tile phase + transform as left. */
const mirrorLinesForRight = (
  lines: Array<[number, number, number, number]>,
): Array<[number, number, number, number]> =>
  lines.map(([x1, y1, x2, y2]) => [
    PATTERN_SIZE - x1,
    y1,
    PATTERN_SIZE - x2,
    y2,
  ]);

const diagonalHatchSvg = (strokeColor: string, direction: 'left' | 'right') => {
  const patternTransform = 'translate(-86.59 -30.89)';
  const sourceLines = subsampledHatchLines(LEFT_DIAGONAL_LINES);
  const lines =
    direction === 'right' ? mirrorLinesForRight(sourceLines) : sourceLines;

  const lineElements = lines
    .map(
      ([x1, y1, x2, y2]) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="3" stroke-miterlimit="10"/>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PATTERN_SIZE} ${PATTERN_SIZE}" width="50" height="50">
    <defs>
      <clipPath id="clip-path-${direction}">
        <rect width="${PATTERN_SIZE}" height="${PATTERN_SIZE}"/>
      </clipPath>
      <pattern id="diagonal-${direction}" width="${PATTERN_SIZE}" height="${PATTERN_SIZE}" patternTransform="${patternTransform}" patternUnits="userSpaceOnUse" viewBox="0 0 ${PATTERN_SIZE} ${PATTERN_SIZE}">
        <rect width="${PATTERN_SIZE}" height="${PATTERN_SIZE}" fill="none"/>
        <g clip-path="url(#clip-path-${direction})">${lineElements}</g>
      </pattern>
    </defs>
    <rect width="${PATTERN_SIZE}" height="${PATTERN_SIZE}" fill="url(#diagonal-${direction})"/>
  </svg>`;
};

export const getSVGShape = (
  strokeColor = '#000000',
  direction: 'left' | 'right' | 'solid' = 'solid',
) => {
  switch (direction) {
    case 'right':
      return diagonalHatchSvg(strokeColor, 'right');
    case 'solid':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
          <rect width="80" height="80" fill="${strokeColor}" />
        </svg>
      `;
    default:
      return diagonalHatchSvg(strokeColor, 'left');
  }
};
