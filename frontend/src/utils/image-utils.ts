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
    // eslint-disable-next-line fp/no-mutation
    SVGContainer.style.display = 'none';
    // eslint-disable-next-line fp/no-mutation
    SVGContainer.innerHTML = svg;
    // eslint-disable-next-line fp/no-mutation
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
const SVGToImage = (settings: SVGToImageSettings): Promise<string | Blob> => {
  return new Promise<string | Blob>(resolve => {
    const svgNode = createSvgNode(settings.svg);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const svgXml = new XMLSerializer().serializeToString(svgNode as Node);
    const svgBase64 = `data:image/svg+xml;base64,${window.btoa(svgXml)}`;

    const image = new Image();

    // eslint-disable-next-line fp/no-mutation
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
      // eslint-disable-next-line fp/no-mutation
      canvas.width = finalWidth;
      // eslint-disable-next-line fp/no-mutation
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
    // eslint-disable-next-line fp/no-mutation
    image.src = svgBase64;
  });
};

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
    console.error(error);
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
  direction: 'left' | 'right' = 'left',
) => {
  // Added switch here for future enhancements maybe horizontal or other directions
  switch (direction) {
    case 'right':
      // Right Diagonal lines svg (///////)
      return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="50" height="50"><defs><style>.cls-1,.cls-3{fill:none;}.cls-2{clip-path:url(#clip-path);}.cls-3{stroke:${strokeColor};stroke-miterlimit:10;stroke-width:2px;}.cls-4{fill:url(#_19-2_black_diagonal);}</style><clipPath id="clip-path"><rect id="SVGID" class="cls-1" width="100" height="100"/></clipPath><pattern id="_19-2_black_diagonal" data-name="19-2 black diagonal" width="100" height="100" patternTransform="translate(-13.41 -30.89)" patternUnits="userSpaceOnUse" viewBox="0 0 100 100"><rect class="cls-1" width="100" height="100"/><g class="cls-2"><line class="cls-3" x1="-13.41" y1="53.03" x2="93.66" y2="-53.03"/><line class="cls-3" x1="-7.86" y1="58.59" x2="99.22" y2="-47.48"/><line class="cls-3" x1="-2.3" y1="64.14" x2="104.78" y2="-41.92"/><line class="cls-3" x1="3.26" y1="69.7" x2="110.34" y2="-36.37"/><line class="cls-3" x1="8.81" y1="75.26" x2="115.89" y2="-30.81"/><line class="cls-3" x1="14.37" y1="80.81" x2="121.44" y2="-25.26"/><line class="cls-3" x1="19.92" y1="86.37" x2="126.99" y2="-19.7"/><line class="cls-3" x1="25.48" y1="91.92" x2="132.55" y2="-14.14"/><line class="cls-3" x1="31.03" y1="97.48" x2="138.1" y2="-8.59"/><line class="cls-3" x1="36.59" y1="103.03" x2="143.66" y2="-3.03"/><line class="cls-3" x1="42.14" y1="108.59" x2="149.21" y2="2.52"/><line class="cls-3" x1="47.7" y1="114.14" x2="154.77" y2="8.08"/><line class="cls-3" x1="53.26" y1="119.7" x2="160.33" y2="13.63"/><line class="cls-3" x1="58.81" y1="125.26" x2="165.88" y2="19.19"/><line class="cls-3" x1="64.37" y1="130.81" x2="171.44" y2="24.74"/><line class="cls-3" x1="69.92" y1="136.37" x2="176.99" y2="30.3"/><line class="cls-3" x1="75.48" y1="141.92" x2="182.55" y2="35.86"/><line class="cls-3" x1="81.03" y1="147.48" x2="188.1" y2="41.41"/><line class="cls-3" x1="86.59" y1="153.03" x2="193.66" y2="46.97"/></g></pattern></defs><title>Asset 8</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><rect class="cls-4" width="100" height="100"/></g></g></svg>`;
    default:
      // Defaults to left diagonal lines (\\\\\\\)
      return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="50" height="50"><defs><style>.cls-1,.cls-3{fill:none;}.cls-2{clip-path:url(#clip-path);}.cls-3{stroke:${strokeColor};stroke-miterlimit:10;stroke-width:2px;}.cls-4{fill:url(#_19-2_black_diagonal);}</style><clipPath id="clip-path"><rect id="SVGID" class="cls-1" width="100" height="100"/></clipPath><pattern id="_19-2_black_diagonal" data-name="19-2 black diagonal" width="100" height="100" patternTransform="translate(-86.59 -30.89)" patternUnits="userSpaceOnUse" viewBox="0 0 100 100"><rect class="cls-1" width="100" height="100"/><g class="cls-2"><line class="cls-3" x1="153.03" y1="53.03" x2="46.97" y2="-53.03"/><line class="cls-3" x1="147.48" y1="58.59" x2="41.41" y2="-47.48"/><line class="cls-3" x1="141.92" y1="64.14" x2="35.86" y2="-41.92"/><line class="cls-3" x1="136.37" y1="69.7" x2="30.3" y2="-36.37"/><line class="cls-3" x1="130.81" y1="75.26" x2="24.74" y2="-30.81"/><line class="cls-3" x1="125.26" y1="80.81" x2="19.19" y2="-25.26"/><line class="cls-3" x1="119.7" y1="86.37" x2="13.63" y2="-19.7"/><line class="cls-3" x1="114.14" y1="91.92" x2="8.08" y2="-14.14"/><line class="cls-3" x1="108.59" y1="97.48" x2="2.52" y2="-8.59"/><line class="cls-3" x1="103.03" y1="103.03" x2="-3.03" y2="-3.03"/><line class="cls-3" x1="97.48" y1="108.59" x2="-8.59" y2="2.52"/><line class="cls-3" x1="91.92" y1="114.14" x2="-14.14" y2="8.08"/><line class="cls-3" x1="86.37" y1="119.7" x2="-19.7" y2="13.63"/><line class="cls-3" x1="80.81" y1="125.26" x2="-25.26" y2="19.19"/><line class="cls-3" x1="75.26" y1="130.81" x2="-30.81" y2="24.74"/><line class="cls-3" x1="69.7" y1="136.37" x2="-36.37" y2="30.3"/><line class="cls-3" x1="64.14" y1="141.92" x2="-41.92" y2="35.86"/><line class="cls-3" x1="58.59" y1="147.48" x2="-47.48" y2="41.41"/><line class="cls-3" x1="53.03" y1="153.03" x2="-53.03" y2="46.97"/></g></pattern></defs><title>Asset 8</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><rect class="cls-4" width="100" height="100"/></g></g></svg>`;
  }
};
