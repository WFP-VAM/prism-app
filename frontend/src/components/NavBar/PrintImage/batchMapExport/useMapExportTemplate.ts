import type { AdminCodeString } from 'config/types';
import type { LngLatBounds } from 'maplibre-gl';
import { getFormattedDate } from 'utils/date-utils';
import type { DateCompatibleLayer } from 'utils/server-utils';

import { calculateExportDimensions } from '../mapDimensionsUtils';
import type { MapDimensions, Toggles } from '../printConfig.context';
import {
  buildBatchExportUrls,
  buildScheduleExportOptions,
  getExportPageLocation,
} from './mapExportTemplate';

export type UseMapExportTemplateInput = {
  mapBounds: LngLatBounds | null;
  mapZoom: number | null;
  mapDimensions: MapDimensions;
  previewMapWidth: number | null;
  previewMapHeight: number | null;
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
};

function printTemplateFields(input: UseMapExportTemplateInput) {
  return {
    mapBounds: input.mapBounds,
    mapZoom: input.mapZoom,
    mapDimensions: input.mapDimensions,
    titleText: input.titleText,
    footerText: input.footerText,
    footerTextSize: input.footerTextSize,
    logoPosition: input.logoPosition,
    logoScale: input.logoScale,
    legendPosition: input.legendPosition,
    legendScale: input.legendScale,
    bottomLogoScale: input.bottomLogoScale,
    toggles: input.toggles,
    selectedBoundaries: input.selectedBoundaries,
  };
}

export function useMapExportTemplate(input: UseMapExportTemplateInput) {
  const viewportDimensions = calculateExportDimensions(
    input.mapDimensions.aspectRatio,
    input.mapDimensions.aspectRatio === 'Auto'
      ? (input.previewMapWidth ?? undefined)
      : undefined,
    input.mapDimensions.aspectRatio === 'Auto'
      ? (input.previewMapHeight ?? undefined)
      : undefined,
  );

  function buildBatchUrlsForTimestamps(
    timestamps: number[],
    printSelectedLayer: DateCompatibleLayer | null,
  ): string[] {
    if (!printSelectedLayer) {
      return [];
    }

    const formattedDates = timestamps
      .map(timestamp => getFormattedDate(timestamp, 'default'))
      .filter((d): d is string => d !== undefined && d !== '');

    if (formattedDates.length === 0) {
      return [];
    }

    const location = getExportPageLocation();
    return buildBatchExportUrls({
      formattedDates,
      origin: location.origin,
      exportPath: location.exportPath,
      baseSearchParams: location.baseSearchParams,
      printSelectedLayer,
      ...printTemplateFields(input),
    });
  }

  function buildScheduleExportOptionsPayload() {
    if (!input.mapBounds) {
      return null;
    }

    const location = getExportPageLocation();
    return buildScheduleExportOptions({
      origin: location.origin,
      exportPath: location.exportPath,
      viewportWidth: viewportDimensions.canvasWidth,
      viewportHeight: viewportDimensions.canvasHeight,
      ...printTemplateFields(input),
      mapBounds: input.mapBounds,
    });
  }

  return {
    viewportDimensions,
    previewBounds: input.mapBounds,
    buildBatchUrlsForTimestamps,
    buildScheduleExportOptionsPayload,
  };
}
