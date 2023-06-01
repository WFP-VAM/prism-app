import { FeatureCollection } from 'geojson';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { BoundaryLayerProps } from '../../config/types';
import { coordFirst } from '../../utils/data-utils';
import { fetchWithTimeout } from '../../utils/fetch-with-timeout';
import { catchErrorAndDispatchNotification } from '../../utils/error-utils';

export interface BoundaryLayerData extends FeatureCollection {}

export const fetchBoundaryLayerData: LazyLoader<BoundaryLayerProps> = () => async (
  params: LayerDataParams<BoundaryLayerProps>,
  { dispatch },
) => {
  const { layer } = params;
  const { path } = layer;
  try {
    const response = await fetchWithTimeout(path);
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
  } catch (error) {
    return catchErrorAndDispatchNotification(
      error as Error,
      dispatch,
      undefined,
      'fetch boundary layer data request timeout',
    );
  }
};
