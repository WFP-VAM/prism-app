import { BoundaryLayerProps } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { BoundaryLayerData } from 'context/layers/boundary';
import { useCountryIso } from 'context/useCountryIso';
import { Map as MaplibreMap, MapSourceDataEvent } from 'maplibre-gl';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { boundaryCache } from './boundary-cache';
import { isUrlDrivenDeployment } from './universal-utils';

export function useBoundaryData(
  layerId: string,
  map?: MaplibreMap,
): {
  data: BoundaryLayerData | undefined;
  loading: boolean;
  error?: string;
} {
  const dispatch = useDispatch();
  const { iso3 } = useCountryIso();
  const iso3Filter = isUrlDrivenDeployment() ? iso3 : undefined;
  const [data, setData] = useState<BoundaryLayerData | undefined>(
    boundaryCache.getCachedData(layerId, iso3Filter),
  );
  const [loading, setLoading] = useState(
    boundaryCache.isLoading(layerId, iso3Filter),
  );
  const [error, setError] = useState<string | undefined>(
    boundaryCache.getError(layerId, iso3Filter),
  );

  useEffect(() => {
    const syncFromCache = () => {
      setData(boundaryCache.getCachedData(layerId, iso3Filter));
      setLoading(boundaryCache.isLoading(layerId, iso3Filter));
      setError(boundaryCache.getError(layerId, iso3Filter));
    };

    return boundaryCache.subscribe(syncFromCache);
  }, [layerId, iso3Filter]);

  const loadData = useCallback(async () => {
    const layer = LayerDefinitions[layerId] as BoundaryLayerProps;
    if (!layer || !map) {
      return;
    }
    const requestKey = `${layerId}:${iso3Filter ?? ''}`;
    try {
      const result = await boundaryCache.getBoundaryData(
        layer,
        dispatch,
        map,
        iso3Filter,
      );
      if (requestKey !== `${layerId}:${iso3Filter ?? ''}`) {
        return;
      }
      setData(result);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [layerId, map, dispatch, iso3Filter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // For PMTiles: retry when tiles finish loading if cache is still empty
  useEffect(() => {
    const layer = LayerDefinitions[layerId] as BoundaryLayerProps;
    if (!map || layer?.format !== 'pmtiles') {
      return undefined;
    }
    const sourceId = `source-${layerId}`;
    const onSourceData = (e: MapSourceDataEvent) => {
      if (e.sourceId === sourceId && e.isSourceLoaded) {
        const cached = boundaryCache.getCachedData(layerId, iso3Filter);
        if (!cached?.features?.length) {
          loadData();
        }
      }
    };
    map.on('sourcedata', onSourceData);
    return () => {
      map.off('sourcedata', onSourceData);
    };
  }, [map, layerId, iso3Filter, loadData]);

  return { data, loading, error };
}
