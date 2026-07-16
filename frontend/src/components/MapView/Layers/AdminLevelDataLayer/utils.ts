import { legendToStops } from 'components/MapView/Layers/layer-utils';
import { AdminLevelDataLayerProps } from 'config/types';
import { Map } from 'maplibre-gl';
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

const addFillPatternImageInMap = async (
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
  const { data: image } = await map.loadImage(convertedImage);
  const imageId = `fill-pattern-${layer.id}-legend-${index}`;
  if (!map.hasImage(imageId)) {
    map.addImage(imageId, image, { pixelRatio: 4 });
  }
};

export const addFillPatternImagesInMap = async (
  layer: AdminLevelDataLayerProps,
  map: Map | undefined,
) => {
  const fillPatternsForLayer = await createFillPatternsForLayerLegends(layer);
  await Promise.all(
    fillPatternsForLayer.map((base64Image, index) =>
      addFillPatternImageInMap(layer, map, index, base64Image),
    ),
  );
};
