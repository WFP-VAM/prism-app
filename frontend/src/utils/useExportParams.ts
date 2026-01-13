import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ExportParams,
  ExportMapBounds,
  MapExportToggles,
} from 'components/MapExport/types';
import { parseAspectRatio } from 'components/MapExport/aspectRatioConstants';
import { AdminCodeString } from 'config/types';
import {
  param,
  defineParam,
  parseUrlParams,
  getBoolParam,
  getNumParam,
} from './urlParamSchema';

const DEFAULT_TOGGLES: MapExportToggles = {
  fullLayerDescription: false,
  countryMask: false,
  mapLabelsVisibility: true,
  logoVisibility: true,
  legendVisibility: true,
  footerVisibility: true,
  bottomLogoVisibility: true,
};

/**
 * Schema defining all export URL parameters.
 * Each entry maps a result property to its URL key and parser.
 */
const exportParamsSchema = {
  // Layer state
  hazardLayerIds: defineParam('hazardLayerIds', param.stringArray()),
  baselineLayerIds: defineParam('baselineLayerId', param.stringArray()),
  date: defineParam('date', param.stringOrNull()),

  // Map bounds
  zoom: defineParam('zoom', param.number(5)),
  bounds: defineParam(
    'bounds',
    param.custom<ExportMapBounds | null>(v => {
      if (!v) {
        return null;
      }
      const [west, south, east, north] = v.split(',').map(parseFloat);
      if ([west, south, east, north].every(n => !Number.isNaN(n))) {
        return { west, south, east, north };
      }
      return null;
    }),
  ),

  // Print config
  mapWidth: defineParam('mapWidth', param.number(100)),
  mapHeight: defineParam('mapHeight', param.number(100)),
  titleText: defineParam('title', param.string('')),
  footerText: defineParam('footer', param.string('')),
  footerTextSize: defineParam('footerTextSize', param.number(12)),

  // Position/scale
  logoPosition: defineParam('logoPosition', param.number(0)),
  logoScale: defineParam('logoScale', param.number(1)),
  legendPosition: defineParam('legendPosition', param.number(0)),
  legendScale: defineParam('legendScale', param.number(1)),
  bottomLogoScale: defineParam('bottomLogoScale', param.number(1)),

  toggles: defineParam(
    'toggles',
    param.custom<MapExportToggles>((v, params) => {
      // Try JSON first (used in NavBar/PrintImage/image.tsx)
      if (v) {
        try {
          return { ...DEFAULT_TOGGLES, ...JSON.parse(v) };
        } catch {
          // Fall through to individual params (human-readable params)
        }
      }

      return {
        fullLayerDescription: getBoolParam(
          params,
          'fullLayerDescription',
          DEFAULT_TOGGLES.fullLayerDescription,
        ),
        countryMask: getBoolParam(
          params,
          'countryMask',
          DEFAULT_TOGGLES.countryMask,
        ),
        mapLabelsVisibility: getBoolParam(
          params,
          'mapLabelsVisibility',
          DEFAULT_TOGGLES.mapLabelsVisibility,
        ),
        logoVisibility: getBoolParam(
          params,
          'logoVisibility',
          DEFAULT_TOGGLES.logoVisibility,
        ),
        legendVisibility: getBoolParam(
          params,
          'legendVisibility',
          DEFAULT_TOGGLES.legendVisibility,
        ),
        footerVisibility: getBoolParam(
          params,
          'footerVisibility',
          DEFAULT_TOGGLES.footerVisibility,
        ),
        bottomLogoVisibility: getBoolParam(
          params,
          'bottomLogoVisibility',
          DEFAULT_TOGGLES.bottomLogoVisibility,
        ),
      };
    }),
  ),

  selectedBoundaries: defineParam(
    'selectedBoundaries',
    param.stringArray<AdminCodeString>(),
  ),

  aspectRatio: defineParam(
    'aspectRatio',
    param.custom((v, params) =>
      parseAspectRatio(
        v,
        params.has('customWidth')
          ? getNumParam(params, 'customWidth', 1)
          : undefined,
        params.has('customHeight')
          ? getNumParam(params, 'customHeight', 1)
          : undefined,
      ),
    ),
  ),
};

/**
 * Custom hook that extracts and parses map export parameters from the URL.
 * Uses a declarative schema for type-safe parsing with defaults.
 */
export const useExportParams = (): ExportParams => {
  const { search } = useLocation();
  return useMemo(
    () => parseUrlParams(search, exportParamsSchema) as ExportParams,
    [search],
  );
};
