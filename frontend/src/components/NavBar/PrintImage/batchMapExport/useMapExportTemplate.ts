import type { AdminCodeString } from 'config/types';
import type { LngLatBounds } from 'maplibre-gl';
import type { AdminAreaRef } from 'utils/adminAreaSelection';
import { getFormattedDate } from 'utils/date-utils';
import type { DateCompatibleLayer } from 'utils/server-utils';

import { calculateExportDimensions } from '../mapDimensionsUtils';
import type { MapDimensions, Toggles } from '../printConfig.context';
import {
  buildBatchExportUrls,
  buildScheduleExportPayload,
  getExportPageLocation,
} from './mapExportTemplate';

export type UseMapExportTemplateInput = {
  mapBounds: LngLatBounds | null;
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
  adminAreaRefs: AdminAreaRef[];
  language: string;
};

function printTemplateFields(input: UseMapExportTemplateInput) {
  return {
    mapBounds: input.mapBounds,
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

function scheduleExportFields(input: UseMapExportTemplateInput) {
  return {
    ...printTemplateFields(input),
    adminAreaRefs: input.adminAreaRefs,
  };
}

function viewportDimensionsForInput(input: UseMapExportTemplateInput) {
  return calculateExportDimensions(
    input.mapDimensions.aspectRatio,
    input.mapDimensions.aspectRatio === 'Auto'
      ? (input.previewMapWidth ?? undefined)
      : undefined,
    input.mapDimensions.aspectRatio === 'Auto'
      ? (input.previewMapHeight ?? undefined)
      : undefined,
  );
}

export function useMapExportTemplate(input: UseMapExportTemplateInput) {
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
      language: input.language,
    });
  }

  function buildScheduleExportPayloadForCreate() {
    if (!input.mapBounds) {
      return null;
    }

    const location = getExportPageLocation();
    const viewport = viewportDimensionsForInput(input);
    return buildScheduleExportPayload({
      origin: location.origin,
      exportPath: location.exportPath,
      viewportWidth: viewport.canvasWidth,
      viewportHeight: viewport.canvasHeight,
      ...scheduleExportFields(input),
      mapBounds: input.mapBounds,
      language: input.language,
    });
  }

  return {
    getViewportDimensions: () => viewportDimensionsForInput(input),
    previewBounds: input.mapBounds,
    buildBatchUrlsForTimestamps,
    buildScheduleExportPayloadForCreate,
  };
}
