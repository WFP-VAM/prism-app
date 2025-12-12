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

export const getSVGShape = (
  strokeColor = '#000000',
  direction: 'left' | 'right' | 'solid' = 'solid',
) => {
  switch (direction) {
    case 'right':
      // Right Diagonal lines svg (///////)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <pattern id="right-diagonal" patternUnits="userSpaceOnUse" width="80" height="80">
              <line x1="0" y1="80" x2="80" y2="0" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="0" y1="60" x2="60" y2="0" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="0" y1="40" x2="40" y2="0" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="0" y1="20" x2="20" y2="0" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="20" y1="80" x2="80" y2="20" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="40" y1="80" x2="80" y2="40" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="60" y1="80" x2="80" y2="60" stroke="${strokeColor}" stroke-width="4"/>
            </pattern>
          </defs>
          <rect width="80" height="80" fill="url(#right-diagonal)" />
        </svg>
      `;
    case 'solid':
      // Solid color square
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
          <rect width="80" height="80" fill="${strokeColor}" />
        </svg>
      `;
    default:
      // Defaults to left diagonal lines (\\\\\\\)
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <pattern id="left-diagonal" patternUnits="userSpaceOnUse" width="80" height="80">
              <line x1="0" y1="0" x2="80" y2="80" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="0" y1="20" x2="20" y2="80" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="0" y1="40" x2="40" y2="80" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="0" y1="60" x2="60" y2="80" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="20" y1="0" x2="80" y2="60" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="40" y1="0" x2="80" y2="40" stroke="${strokeColor}" stroke-width="4"/>
              <line x1="60" y1="0" x2="80" y2="20" stroke="${strokeColor}" stroke-width="4"/>
            </pattern>
          </defs>
          <rect width="80" height="80" fill="url(#left-diagonal)" />
        </svg>
      `;
  }
};
