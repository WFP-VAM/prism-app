import type { AdminCodeString, BoundaryLayerProps } from 'config/types';
import type { LayerData } from 'context/layers/layer-data';
import type i18n from 'i18next';
import { useEffect, useState } from 'react';

import {
  type AdminAreaClipPolygon,
  bboxOfClipPolygon,
  isBboxWithinBounds,
  type LngLatBbox,
  resolveAdminAreaClipPolygon,
} from './adminAreaClipPolygon';
import { isUniversalDeployment } from './universal-utils';

export function useAdminAreaClipPolygon(options: {
  enabled: boolean;
  country: string;
  selectedBoundaries: AdminCodeString[];
  boundaryData: LayerData<BoundaryLayerProps>['data'] | undefined;
  boundaryLayer: BoundaryLayerProps;
  i18nLocale: typeof i18n;
  getLayerData: (
    layerId: string,
  ) => LayerData<BoundaryLayerProps>['data'] | undefined;
  /** Bump when async boundary layer loads complete (e.g. admin1/admin2). */
  boundaryLayersVersion?: number;
  /** Main map bounds [west, south, east, north] for PMTiles coverage checks. */
  coverageBounds?: LngLatBbox;
  onIncompleteCoverage?: () => void;
}): AdminAreaClipPolygon | null {
  const [adminAreaClipPolygon, setAdminAreaClipPolygon] =
    useState<AdminAreaClipPolygon | null>(null);

  const {
    enabled,
    country,
    selectedBoundaries,
    boundaryData,
    boundaryLayer,
    i18nLocale,
    getLayerData,
    boundaryLayersVersion = 0,
    coverageBounds,
    onIncompleteCoverage,
  } = options;

  useEffect(() => {
    if (!enabled) {
      setAdminAreaClipPolygon(null);
      return undefined;
    }

    let cancelled = false;

    void resolveAdminAreaClipPolygon({
      country,
      selectedBoundaries,
      boundaryData,
      boundaryLayer,
      i18nLocale,
      getLayerData,
    })
      .then(polygon => {
        if (cancelled) {
          return;
        }

        let result = polygon;
        if (
          result &&
          isUniversalDeployment() &&
          selectedBoundaries.length > 0 &&
          coverageBounds
        ) {
          const clipBbox = bboxOfClipPolygon(result);
          if (!isBboxWithinBounds(clipBbox, coverageBounds)) {
            onIncompleteCoverage?.();
            result = null;
          }
        }

        setAdminAreaClipPolygon(result);
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Error resolving admin area clip polygon:', error);
          setAdminAreaClipPolygon(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    country,
    selectedBoundaries,
    boundaryData,
    boundaryLayer,
    i18nLocale,
    getLayerData,
    boundaryLayersVersion,
    coverageBounds,
    onIncompleteCoverage,
  ]);

  return adminAreaClipPolygon;
}
