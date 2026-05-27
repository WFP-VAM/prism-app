import { isCustomRatio } from 'components/MapExport/aspectRatioConstants';
import type { AdminCodeString } from 'config/types';
import type { LngLatBounds } from 'maplibre-gl';
import type { ScheduleExportOptions } from 'utils/mapExportSchedulesApi';

import type { MapDimensions, Toggles } from '../printConfig.context';

export type BuildScheduleExportOptionsInput = {
  origin: string;
  exportPath: string;
  mapBounds: LngLatBounds;
  mapZoom: number | null;
  mapDimensions: MapDimensions;
  titleText: string;
  footerText: string;
  footerTextSize: number;
  logoPosition: number;
  logoScale: number;
  legendPosition: number;
  legendScale: number;
  bottomLogoScale: number;
  toggles: Toggles;
  selectedBoundaries: AdminCodeString[];
  viewportWidth: number;
  viewportHeight: number;
};

/** Structured template for POST /export-map/schedules (matches batch export URL builder). */
export function buildScheduleExportOptions(
  input: BuildScheduleExportOptionsInput,
): ScheduleExportOptions {
  const bounds = `${input.mapBounds.getWest()},${input.mapBounds.getSouth()},${input.mapBounds.getEast()},${input.mapBounds.getNorth()}`;

  const queryParams: ScheduleExportOptions['queryParams'] = {
    bounds,
  };

  if (input.mapZoom != null) {
    queryParams.zoom = String(input.mapZoom);
  }

  queryParams.mapWidth = 100;
  queryParams.mapHeight = 100;

  if (isCustomRatio(input.mapDimensions.aspectRatio)) {
    queryParams.aspectRatio = 'Custom';
    queryParams.customWidth = input.mapDimensions.aspectRatio.w;
    queryParams.customHeight = input.mapDimensions.aspectRatio.h;
  } else {
    queryParams.aspectRatio = input.mapDimensions.aspectRatio;
  }

  queryParams.title = input.titleText;
  queryParams.footer = input.footerText;
  queryParams.footerTextSize = input.footerTextSize;
  queryParams.logoPosition = input.logoPosition;
  queryParams.logoScale = input.logoScale;
  queryParams.legendPosition = input.legendPosition;
  queryParams.legendScale = input.legendScale;
  queryParams.bottomLogoScale = input.bottomLogoScale;

  queryParams.toggles = {
    fullLayerDescription: input.toggles.fullLayerDescription,
    countryMask: input.toggles.countryMask,
    mapLabelsVisibility: input.toggles.mapLabelsVisibility,
    logoVisibility: input.toggles.logoVisibility,
    legendVisibility: input.toggles.legendVisibility,
    footerVisibility: input.toggles.footerVisibility,
    bottomLogoVisibility: input.toggles.bottomLogoVisibility,
  };

  if (input.selectedBoundaries.length > 0) {
    queryParams.selectedBoundaries = input.selectedBoundaries;
  }

  return {
    origin: input.origin,
    exportPath: input.exportPath,
    queryParams,
    viewportWidth: input.viewportWidth,
    viewportHeight: input.viewportHeight,
  };
}
