import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'context/hooks';
import {
  dashboardSyncEnabledSelector,
  dashboardSharedViewportSelector,
  dashboardMapElementsSelector,
  setSharedViewport,
} from 'context/dashboardStateSlice';
import { useMapState } from 'utils/useMapState';

export const useDashboardMapSync = (mode?: string) => {
  const dispatch = useDispatch();
  const syncEnabled = useSelector(dashboardSyncEnabledSelector);
  const sharedViewport = useSelector(dashboardSharedViewportSelector);
  const dashboardMaps = useSelector(dashboardMapElementsSelector);
  const { maplibreMap, elementId } = useMapState();
  const isUpdatingRef = useRef(false);
  // Track layout changes to prevent sync during mode transitions
  const previousModeRef = useRef(mode);
  const layoutChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSync =
    elementId !== undefined && syncEnabled && dashboardMaps.length > 1;

  // Detect mode changes and temporarily disable sync during layout transitions
  useEffect(() => {
    if (previousModeRef.current !== mode) {
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }
      isUpdatingRef.current = true;
      layoutChangeTimeoutRef.current = setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);

      previousModeRef.current = mode;
    }

    return () => {
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }
    };
  }, [mode]);

  useEffect(() => {
    if (!shouldSync) {
      return;
    }

    const map = maplibreMap();
    if (!map) {
      return;
    }

    const handleViewportChange = () => {
      if (isUpdatingRef.current) {
        return;
      }

      const bounds = map.getBounds();
      const zoom = map.getZoom();

      dispatch(
        setSharedViewport({
          bounds: [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
          ],
          zoom,
        }),
      );
    };

    // Use MapLibre's native moveend/zoomend events directly
    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);

    // eslint-disable-next-line consistent-return
    return () => {
      map.off('moveend', handleViewportChange);
      map.off('zoomend', handleViewportChange);
    };
  }, [shouldSync, maplibreMap, dispatch]);

  // Apply shared viewport changes to this map (when other maps change)
  useEffect(() => {
    if (!shouldSync || !sharedViewport || isUpdatingRef.current) {
      return;
    }

    const map = maplibreMap();
    if (!map) {
      return;
    }

    // Set flag to prevent triggering viewport change events
    isUpdatingRef.current = true;

    try {
      const [west, south, east, north] = sharedViewport.bounds;
      map.fitBounds([west, south, east, north], {
        duration: 200, // Smooth transition
        padding: 0,
      });
    } catch (error) {
      console.warn('Failed to sync map viewport:', error);
    }

    // Reset flag after a short delay
    const resetTimeout = setTimeout(() => {
      isUpdatingRef.current = false;
    }, 250);

    // eslint-disable-next-line consistent-return
    return () => clearTimeout(resetTimeout);
  }, [shouldSync, sharedViewport, maplibreMap]);
};
