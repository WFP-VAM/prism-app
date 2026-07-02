import type { AdminCodeString, BoundaryLayerProps } from 'config/types';
import type { LayerData } from 'context/layers/layer-data';
import { addNotification } from 'context/notificationStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { useSafeTranslation } from 'i18n';
import type i18n from 'i18next';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import {
  type AdminAreaClipPolygon,
  type LngLatBbox,
} from './adminAreaClipPolygon';
import { getCachedBoundaryLayerData } from './boundary-cache';
import {
  getDisplayBoundaryLayersForIso3,
  isUniversalDeployment,
} from './universal-utils';
import { useAdminAreaClipPolygon } from './useAdminAreaClipPolygon';

/**
 * Export/print wrapper around {@link useAdminAreaClipPolygon} that wires up the
 * universal-deployment concerns shared by the print dialog and the /export view:
 *  - ISO3-scoped boundary cache lookups,
 *  - a coverage guard against PMTiles clip polygons that only cover loaded
 *    viewport tiles (with a user-facing warning),
 * keyed off the main map's current bounds.
 */
export function useAdminAreaClipForExport(options: {
  enabled: boolean;
  country: string;
  selectedBoundaries: AdminCodeString[];
  boundaryData: LayerData<BoundaryLayerProps>['data'] | undefined;
  boundaryLayer: BoundaryLayerProps;
  i18nLocale: typeof i18n;
  boundaryLayersVersion?: number;
  map: MaplibreMap | null | undefined;
}): AdminAreaClipPolygon | null {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { iso3 } = useCountryIso();

  const {
    map,
    boundaryLayer,
    boundaryData,
    boundaryLayersVersion,
    ...clipOptions
  } = options;

  // Source of boundary layer differs between non-universal and universal deployments.
  const effectiveBoundaryLayer = useMemo(() => {
    if (!isUniversalDeployment()) {
      return boundaryLayer;
    }
    // Universal deployment: use the boundary layer for the current ISO3, unless it's hidden in Go To.
    return (
      getDisplayBoundaryLayersForIso3(iso3).find(layer => !layer.hideInGoTo) ??
      boundaryLayer
    );
  }, [boundaryLayer, iso3]);

  // Source of boundary data differs between non-universal and universal deployments.
  const effectiveBoundaryData = useMemo(() => {
    if (!isUniversalDeployment()) {
      return boundaryData;
    }
    // Universal deployment: use the cached boundary layer data for the current ISO3.
    return (
      getCachedBoundaryLayerData(effectiveBoundaryLayer.id, iso3) ??
      boundaryData
    );
  }, [boundaryData, effectiveBoundaryLayer.id, iso3, boundaryLayersVersion]);

  const getLayerData = useCallback(
    (layerId: string) =>
      getCachedBoundaryLayerData(
        layerId,
        isUniversalDeployment() ? iso3 : undefined,
      ),
    [iso3],
  );

  const onIncompleteCoverage = useCallback(() => {
    dispatch(
      addNotification({
        message: t(
          'Selected area extends beyond the loaded map view; pan/zoom to the area and reopen to enable clipping.',
        ),
        type: 'warning',
      }),
    );
  }, [dispatch, t]);

  const coverageBounds = useMemo((): LngLatBbox | undefined => {
    if (!map) {
      return undefined;
    }
    const bounds = map.getBounds();
    return [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
  }, [map]);

  return useAdminAreaClipPolygon({
    ...clipOptions,
    boundaryLayer: effectiveBoundaryLayer,
    boundaryData: effectiveBoundaryData,
    boundaryLayersVersion,
    getLayerData,
    coverageBounds,
    onIncompleteCoverage,
  });
}
