import { useClipForSelectedAdminAreas } from 'components/MapExport/clipContext';
import type { FeatureCollection } from 'geojson';
import { useEffect, useState } from 'react';

import { clipFeatureCollectionToPolygon } from './clipVectorData';

/**
 * Clip a feature collection off the render path when export mask has specific
 * admin areas selected. Full-region masks return data unclipped; raster layers
 * clip separately via clip://.
 */
export function useClippedFeatureCollection<T extends FeatureCollection>(
  data: T | undefined,
): T | undefined {
  const clip = useClipForSelectedAdminAreas();
  const [clipped, setClipped] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!data || !clip) {
      setClipped(undefined);
      return undefined;
    }

    let cancelled = false;

    const runClip = () => {
      const result = clipFeatureCollectionToPolygon(
        data,
        clip.clipPolygon,
        clip.clipId,
      );
      if (!cancelled) {
        setClipped(result);
      }
    };

    if (typeof requestIdleCallback === 'function') {
      const idleId = requestIdleCallback(runClip, { timeout: 250 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = setTimeout(runClip, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [clip, data]);

  if (!data) {
    return undefined;
  }
  if (!clip) {
    return data;
  }

  return clipped;
}
