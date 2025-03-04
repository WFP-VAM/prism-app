import { FeatureCollection } from 'geojson';
import { BoundaryLayerProps } from 'config/types';
import { coordFirst } from 'utils/data-utils';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { LocalError } from 'utils/error-utils';
import { addNotification } from 'context/notificationStateSlice';
import { getPmtilesInstance } from 'utils/pmtiles-utils';
import type { LayerDataParams, LazyLoader } from './layer-data';

export interface BoundaryLayerData extends FeatureCollection {}

export const fetchBoundaryLayerData: LazyLoader<BoundaryLayerProps> =
  () =>
  async (params: LayerDataParams<BoundaryLayerProps>, { dispatch }) => {
    const { layer, map } = params;
    const { path, format } = layer;

    try {
      if (format === 'pmtiles') {
        const p = getPmtilesInstance(path);
        const header = await p.getHeader();

        const allFeatures = map.querySourceFeatures(`source-${layer.id}`, {
          sourceLayer: layer.layerName,
        });

        return {
          type: 'FeatureCollection',
          features: allFeatures,
          properties: { header },
        };
      }

      // Original GeoJSON fetching logic
      const response = await fetchWithTimeout(
        path,
        dispatch,
        {},
        `Request failed for fetching boundary layer data at ${path}`,
      );
      const geojson = await response.json();

      const coordinate = coordFirst(geojson);
      coordinate.forEach(number => {
        const numberString = number.toString();
        if (
          numberString.includes('.') &&
          numberString.length - numberString.indexOf('.') - 1 > 9
        ) {
          throw new LocalError(
            `Coordinates in ${path.replace(
              '..',
              '',
            )} have too many decimal numbers.  You can fix this by running bash ./scripts/truncate_precision.sh`,
          );
        }
      });
      return geojson;
    } catch (error) {
      if (!(error instanceof LocalError)) {
        return undefined;
      }
      console.error(error);
      dispatch(
        addNotification({
          message: error.message,
          type: 'warning',
        }),
      );
      return undefined;
    }
  };
