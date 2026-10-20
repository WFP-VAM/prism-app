import { safeCountry } from 'config';
import { addNotification } from 'context/notificationStateSlice';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { fetchUnifiedCountryBoundaryPolygon } from './adminAreaClipPolygon';

export type DeploymentClipPolygon = Feature<Polygon | MultiPolygon>;

export type DeploymentClipPolygonState = {
  polygon: DeploymentClipPolygon | null;
  /** True when the outline could not be loaded; clipped layers cannot render. */
  failed: boolean;
};

let failureNotified = false;

/**
 * Unified deployment country outline from preprocess-layers.
 * Used to scope global datasets (e.g. FTW PMTiles) to the active country.
 * Only fetches when `enabled`, so layers that don't clip never trigger the
 * request or its failure warning (e.g. deployments without the outline file).
 * Shares the fetch cache with adminAreaClipPolygon and other callers.
 */
export function useDeploymentClipPolygon(
  enabled: boolean,
): DeploymentClipPolygonState {
  const dispatch = useDispatch();
  const [state, setState] = useState<DeploymentClipPolygonState>({
    polygon: null,
    failed: false,
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let cancelled = false;

    fetchUnifiedCountryBoundaryPolygon(safeCountry)
      .then(polygon => {
        if (!cancelled) {
          setState({ polygon, failed: false });
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        setState({ polygon: null, failed: true });
        if (!failureNotified) {
          failureNotified = true;
          console.error('Failed to load deployment clip polygon:', error);
          dispatch(
            addNotification({
              message: `Failed to load the country outline; country-clipped layers will not be shown (${error.message}).`,
              type: 'warning',
            }),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, enabled]);

  return state;
}
