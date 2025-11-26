import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Map as MaplibreMap } from 'maplibre-gl';
import { BoundaryLayerProps } from 'config/types';
import { BoundaryLayerData } from 'context/layers/boundary';
import { LayerDefinitions } from 'config/utils';
import { boundaryCache } from './boundary-cache';

export function useBoundaryData(
  layerId: string,
  map?: MaplibreMap,
): {
  data: BoundaryLayerData | undefined;
  loading: boolean;
  error?: string;
} {
  const dispatch = useDispatch();
  const [data, setData] = useState<BoundaryLayerData | undefined>(
    boundaryCache.getCachedData(layerId),
  );
  const [loading, setLoading] = useState(boundaryCache.isLoading(layerId));
  const [error, setError] = useState<string | undefined>(
    boundaryCache.getError(layerId),
  );

  useEffect(() => {
    const layer = LayerDefinitions[layerId] as BoundaryLayerProps;
    if (!layer) {
      setError(`Layer ${layerId} not found in LayerDefinitions`);
      return undefined;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const result = await boundaryCache.getBoundaryData(
          layer,
          dispatch,
          map,
        );
        if (!cancelled) {
          setData(result);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      // eslint-disable-next-line fp/no-mutation
      cancelled = true;
    };
  }, [layerId, map, dispatch]);

  return { data, loading, error };
}
