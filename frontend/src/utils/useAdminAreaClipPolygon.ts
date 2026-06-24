import type { AdminCodeString, BoundaryLayerProps } from 'config/types';
import type { LayerData } from 'context/layers/layer-data';
import type i18n from 'i18next';
import { useEffect, useState } from 'react';

import {
  type AdminAreaClipPolygon,
  resolveAdminAreaClipPolygon,
} from './adminAreaClipPolygon';

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
        if (!cancelled) {
          setAdminAreaClipPolygon(polygon);
        }
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
  ]);

  return adminAreaClipPolygon;
}
