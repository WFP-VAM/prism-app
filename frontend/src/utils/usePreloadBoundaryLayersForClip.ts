import type { Dispatch } from '@reduxjs/toolkit';
import { getBoundaryLayers } from 'config/utils';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';

import { boundaryCache } from './boundary-cache';

export function usePreloadBoundaryLayersForClip(options: {
  enabled: boolean;
  dispatch: Dispatch<any>;
  map?: MaplibreMap;
}): number {
  const { enabled, dispatch, map } = options;
  const [boundaryLayersVersion, setBoundaryLayersVersion] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    void boundaryCache
      .preloadBoundaries(getBoundaryLayers(), dispatch, map)
      .then(() => {
        if (!cancelled) {
          setBoundaryLayersVersion(version => version + 1);
        }
      })
      .catch(error => {
        console.error('Failed to preload boundary layers for clip:', error);
        if (!cancelled) {
          setBoundaryLayersVersion(version => version + 1);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, enabled, map]);

  return boundaryLayersVersion;
}
