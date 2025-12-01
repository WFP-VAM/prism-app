import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ExportParams,
  ExportMapBounds,
  MapExportToggles,
} from 'components/MapExport/types';
import { AdminCodeString } from 'config/types';

const DEFAULT_TOGGLES: MapExportToggles = {
  fullLayerDescription: false,
  countryMask: false,
  mapLabelsVisibility: true,
  logoVisibility: true,
  legendVisibility: true,
  footerVisibility: true,
};

export const useExportParams = (): ExportParams => {
  const { search } = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(search);

    // Helper to parse boolean (defaults to false)
    const getBool = (key: string, defaultVal = false): boolean => {
      const val = params.get(key);
      if (val === null) {
        return defaultVal;
      }
      return val === 'true' || val === '1';
    };

    // Helper to parse number with default
    const getNum = (key: string, defaultVal: number): number => {
      const val = params.get(key);
      if (val === null) {
        return defaultVal;
      }
      const num = parseFloat(val);
      return Number.isNaN(num) ? defaultVal : num;
    };

    // Parse bounds from comma-separated string: "west,south,east,north"
    const parseBounds = (): ExportMapBounds | null => {
      const boundsStr = params.get('bounds');
      if (!boundsStr) {
        return null;
      }
      const [west, south, east, north] = boundsStr.split(',').map(parseFloat);
      if ([west, south, east, north].every(n => !Number.isNaN(n))) {
        return { west, south, east, north };
      }
      return null;
    };
    const bounds = parseBounds();

    // Parse layer IDs (comma-separated)
    const hazardLayerIds =
      params.get('hazardLayerIds')?.split(',').filter(Boolean) ?? [];
    const baselineLayerIds =
      params.get('baselineLayerId')?.split(',').filter(Boolean) ?? [];

    // Parse toggles - can be passed as individual params or as JSON
    const parseToggles = (): MapExportToggles => {
      const togglesJson = params.get('toggles');
      if (togglesJson) {
        try {
          return { ...DEFAULT_TOGGLES, ...JSON.parse(togglesJson) };
        } catch {
          return DEFAULT_TOGGLES;
        }
      }
      return {
        fullLayerDescription: getBool(
          'fullLayerDescription',
          DEFAULT_TOGGLES.fullLayerDescription,
        ),
        countryMask: getBool('countryMask', DEFAULT_TOGGLES.countryMask),
        mapLabelsVisibility: getBool(
          'mapLabelsVisibility',
          DEFAULT_TOGGLES.mapLabelsVisibility,
        ),
        logoVisibility: getBool(
          'logoVisibility',
          DEFAULT_TOGGLES.logoVisibility,
        ),
        legendVisibility: getBool(
          'legendVisibility',
          DEFAULT_TOGGLES.legendVisibility,
        ),
        footerVisibility: getBool(
          'footerVisibility',
          DEFAULT_TOGGLES.footerVisibility,
        ),
      };
    };
    const toggles = parseToggles();

    // Parse selected boundaries (comma-separated admin codes)
    const selectedBoundaries =
      (params
        .get('selectedBoundaries')
        ?.split(',')
        .filter(Boolean) as AdminCodeString[]) ?? [];

    return {
      // Layer state
      hazardLayerIds,
      baselineLayerIds,
      date: params.get('date'),

      // Map bounds
      bounds,
      zoom: getNum('zoom', 5),

      // Print config
      mapWidth: getNum('mapWidth', 100),
      titleText: params.get('title') ?? '',
      footerText: params.get('footer') ?? '',
      footerTextSize: getNum('footerTextSize', 12),

      // Position/scale
      logoPosition: getNum('logoPosition', 0),
      logoScale: getNum('logoScale', 1),
      legendPosition: getNum('legendPosition', 0),
      legendScale: getNum('legendScale', 1),

      // Toggles
      toggles,

      // Boundaries
      selectedBoundaries,
    };
  }, [search]);
};
