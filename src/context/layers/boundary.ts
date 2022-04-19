import { FeatureCollection } from 'geojson';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { BoundaryLayerProps } from '../../config/types';
import { coordFirst } from '../../utils/data-utils';

export interface BoundaryLayerData extends FeatureCollection {}

export const fetchBoundaryLayerData: LazyLoader<BoundaryLayerProps> = () => async (
  params: LayerDataParams<BoundaryLayerProps>,
) => {
  const { layer } = params;
  const { path } = layer;

  const response = await fetch(path);
  const geojson = await response.json();

  const coordinate = coordFirst(geojson);
  coordinate.forEach(number => {
    const numberString = number.toString();
    if (
      numberString.includes('.') &&
      numberString.length - numberString.indexOf('.') - 1 > 9
    ) {
      throw new Error(
        `Coordinates in ${path.replace(
          '..',
          '',
        )} have too many decimal numbers.  You can fix this by running bash ./scripts/truncate_precision.sh`,
      );
    }
  });

  return geojson;
};
