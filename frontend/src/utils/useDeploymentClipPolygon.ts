import { safeCountry } from 'config';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { useEffect, useState } from 'react';

export type DeploymentClipPolygon = Feature<Polygon | MultiPolygon>;

/**
 * Unified deployment country outline from preprocess-layers.
 * Used to scope global datasets (e.g. FTW PMTiles) to the active country.
 */
export function useDeploymentClipPolygon(): DeploymentClipPolygon | null {
  const [polygon, setPolygon] = useState<DeploymentClipPolygon | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/data/${safeCountry}/admin-boundary-unified-polygon.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!cancelled) {
          setPolygon(data as DeploymentClipPolygon);
        }
      })
      .catch(error => {
        console.error('Failed to load deployment clip polygon:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return polygon;
}
