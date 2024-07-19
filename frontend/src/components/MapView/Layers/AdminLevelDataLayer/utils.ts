import { AdminLevelDataLayerProps } from 'config/types';
import { Map } from 'maplibre-gl';
import { legendToStops } from 'components/MapView/Layers/layer-utils';
import { convertSvgToPngBase64Image, getSVGShape } from 'utils/image-utils';

const createFillPatternsForLayerLegends = async (
  layer: AdminLevelDataLayerProps,
) =>
  Promise.all(
    legendToStops(layer.legend).map(async (legendToStop, index) =>
      convertSvgToPngBase64Image(
        getSVGShape(
          legendToStop[1] as string,
          layer.fillPattern || layer.legend[index]?.fillPattern,
        ),
      ),
    ),
  );

const addFillPatternImageInMap = (
  layer: AdminLevelDataLayerProps,
  map: Map | undefined,
  index: number,
  convertedImage?: string,
) => {
  if (
    !map ||
    !convertedImage ||
    (!layer.fillPattern && !layer.legend.some(l => l.fillPattern))
  ) {
    return;
  }
  map.loadImage(convertedImage, (err: any, image) => {
    // Throw an error if something goes wrong.
    if (err) {
      throw err;
    }
    if (!image) {
      return;
    }
    // Add the image to the map style if it doesn't already exist
    const imageId = `fill-pattern-${layer.id}-legend-${index}`;
    if (!map.hasImage(imageId)) {
      // Add the image since it doesn't exist
      map.addImage(imageId, image, { pixelRatio: 4 });
    }
  });
};

export const addFillPatternImagesInMap = async (
  layer: AdminLevelDataLayerProps,
  map: any,
) => {
  const fillPatternsForLayer = await createFillPatternsForLayerLegends(layer);
  fillPatternsForLayer.forEach((base64Image, index) => {
    addFillPatternImageInMap(layer, map, index, base64Image);
  });
};
