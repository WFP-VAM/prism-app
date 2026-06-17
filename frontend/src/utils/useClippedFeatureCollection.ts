import type { ClipContextValue } from 'components/MapExport/clipContext';
import type { FeatureCollection } from 'geojson';
import { useEffect, useState } from 'react';

import { clipFeatureCollectionToPolygon } from './clipVectorData';

/**
 * Clip a feature collection off the render path so MapGL can load first.
 * Used by export/print layers when ClipProvider is active.
 */
export function useClippedFeatureCollection<T extends FeatureCollection>(
  data: T | undefined,
  clip: ClipContextValue | null,
): T | undefined {
  const [clipped, setClipped] = useState<T | undefined>(() => {
    if (!data) {
      return undefined;
    }
    if (!clip) {
      return data;
    }
    return undefined;
  });

  useEffect(() => {
    if (!data) {
      setClipped(undefined);
      return undefined;
    }
    if (!clip) {
      setClipped(data);
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

  return clipped;
}
