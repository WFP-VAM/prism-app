import { BoundaryLayerProps } from 'config/types';
import { addNotification } from 'context/notificationStateSlice';
import { FeatureCollection } from 'geojson';
import { coordFirst } from 'utils/data-utils';
import { LocalError } from 'utils/error-utils';
import { fetchWithTimeout } from 'utils/fetch-with-timeout';
import { getPmtilesInstance } from 'utils/pmtiles-utils';
import { filterFeaturesByIso3 } from 'utils/universal-utils';

import type { LayerDataParams, LazyLoader } from './layer-data';

export interface BoundaryLayerData extends FeatureCollection {}

export const fetchBoundaryLayerData: LazyLoader<BoundaryLayerProps> =
  () =>
  async (params: LayerDataParams<BoundaryLayerProps>, { dispatch }) => {
    const { layer, map, iso3Filter } = params;
    const { path, format } = layer;

    try {
      if (format === 'pmtiles') {
        const p = getPmtilesInstance(path);
        const header = await p.getHeader();

        const allFeatures = map.querySourceFeatures(`source-${layer.id}`, {
          sourceLayer: layer.layerName,
        });

        const features = filterFeaturesByIso3(
          allFeatures,
          iso3Filter as string | undefined,
        );

        return {
          type: 'FeatureCollection',
          features,
          properties: { header },
        };
      }

      // GeoJSON fetching logic
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
      if (iso3Filter) {
        return {
          ...geojson,
          features: filterFeaturesByIso3(
            geojson.features ?? [],
            iso3Filter as string,
          ),
        };
      }
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
