import { isCustomRatio } from 'components/MapExport/aspectRatioConstants';
import type { AdminCodeString } from 'config/types';
import type { LngLatBounds } from 'maplibre-gl';
import { getMapExportPageOrigin } from 'utils/constants';
import {
  EXPORT_LANGUAGE_PARAM,
  toExportLanguageParam,
} from 'utils/exportLanguage';
import type { ScheduleExportOptions } from 'utils/mapExportSchedulesApi';

import type { MapDimensions, Toggles } from '../printConfig.context';
import type { BuildBatchExportUrlsInput } from './types';

/** Print layout fields shared by batch export URLs and schedule export_options. */
export type MapExportPrintTemplate = {
  mapBounds: LngLatBounds | null;
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
};

export type BuildScheduleExportOptionsInput = MapExportPrintTemplate & {
  origin: string;
  exportPath: string;
  mapBounds: LngLatBounds;
  viewportWidth: number;
  viewportHeight: number;
};

export type ExportPageLocation = {
  origin: string;
  exportPath: string;
  baseSearchParams: URLSearchParams;
};

/** Resolve export page origin/path and inherit current app query params. */
export function getExportPageLocation(
  pageHref: string = window.location.href,
): ExportPageLocation {
  const pageUrl = new URL(pageHref);
  const { pathname, search } = pageUrl;
  return {
    origin: getMapExportPageOrigin(pageUrl),
    exportPath: `${pathname.replace(/\/$/, '')}/export`,
    baseSearchParams: new URLSearchParams(search),
  };
}

function boundsString(mapBounds: LngLatBounds): string {
  return `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
}

export function exportTogglesForUrl(toggles: Toggles): Record<string, boolean> {
  return {
    fullLayerDescription: toggles.fullLayerDescription,
    countryMask: toggles.countryMask,
    mapLabelsVisibility: toggles.mapLabelsVisibility,
    logoVisibility: toggles.logoVisibility,
    legendVisibility: toggles.legendVisibility,
    footerVisibility: toggles.footerVisibility,
    bottomLogoVisibility: toggles.bottomLogoVisibility,
  };
}

/** Apply shared print template fields to export URL search params. */
export function applyMapExportPrintTemplate(
  params: URLSearchParams,
  template: MapExportPrintTemplate,
): void {
  if (template.mapBounds) {
    params.set('bounds', boundsString(template.mapBounds));
  }
  if (template.mapZoom != null) {
    params.set('zoom', String(template.mapZoom));
  }

  params.set('mapWidth', '100');
  params.set('mapHeight', '100');

  if (isCustomRatio(template.mapDimensions.aspectRatio)) {
    params.set('aspectRatio', 'Custom');
    params.set('customWidth', String(template.mapDimensions.aspectRatio.w));
    params.set('customHeight', String(template.mapDimensions.aspectRatio.h));
  } else {
    params.set('aspectRatio', template.mapDimensions.aspectRatio);
  }

  params.set('title', template.titleText);
  params.set('footer', template.footerText);
  params.set('footerTextSize', String(template.footerTextSize));
  params.set('logoPosition', String(template.logoPosition));
  params.set('logoScale', String(template.logoScale));
  params.set('legendPosition', String(template.legendPosition));
  params.set('legendScale', String(template.legendScale));
  params.set('bottomLogoScale', String(template.bottomLogoScale));
  params.set('toggles', JSON.stringify(exportTogglesForUrl(template.toggles)));

  if (template.selectedBoundaries.length > 0) {
    params.set('selectedBoundaries', template.selectedBoundaries.join(','));
  }
}

function printTemplateFromBatchInput(
  input: BuildBatchExportUrlsInput,
): MapExportPrintTemplate {
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

export function buildBatchExportUrls(
  input: BuildBatchExportUrlsInput,
): string[] {
  const template = printTemplateFromBatchInput(input);

  return input.formattedDates
    .filter((date): date is string => date !== undefined)
    .map(date => {
      const params = new URLSearchParams(input.baseSearchParams);
      params.set('date', date);
      params.set('hazardLayerIds', input.printSelectedLayer.id);
      params.delete('baselineLayerId');
      applyMapExportPrintTemplate(params, template);
      if (input.language) {
        params.set(
          EXPORT_LANGUAGE_PARAM,
          toExportLanguageParam(input.language),
        );
      }
      return `${input.origin}${input.exportPath}?${params.toString()}`;
    });
}

function scheduleQueryParamsFromTemplate(
  template: MapExportPrintTemplate & { mapBounds: LngLatBounds },
): ScheduleExportOptions['queryParams'] {
  const queryParams: ScheduleExportOptions['queryParams'] = {
    bounds: boundsString(template.mapBounds),
    mapWidth: 100,
    mapHeight: 100,
    title: template.titleText,
    footer: template.footerText,
    footerTextSize: template.footerTextSize,
    logoPosition: template.logoPosition,
    logoScale: template.logoScale,
    legendPosition: template.legendPosition,
    legendScale: template.legendScale,
    bottomLogoScale: template.bottomLogoScale,
    toggles: exportTogglesForUrl(template.toggles),
  };

  if (template.mapZoom != null) {
    queryParams.zoom = String(template.mapZoom);
  }

  if (isCustomRatio(template.mapDimensions.aspectRatio)) {
    queryParams.aspectRatio = 'Custom';
    queryParams.customWidth = template.mapDimensions.aspectRatio.w;
    queryParams.customHeight = template.mapDimensions.aspectRatio.h;
  } else {
    queryParams.aspectRatio = template.mapDimensions.aspectRatio;
  }

  if (template.selectedBoundaries.length > 0) {
    queryParams.selectedBoundaries = [...template.selectedBoundaries];
  }

  return queryParams;
}

export function buildScheduleExportOptions(
  input: BuildScheduleExportOptionsInput,
): ScheduleExportOptions {
  return {
    origin: input.origin,
    exportPath: input.exportPath,
    queryParams: scheduleQueryParamsFromTemplate(input),
    viewportWidth: input.viewportWidth,
    viewportHeight: input.viewportHeight,
  };
}

export function formatExportUrlForClipboard(exportUrl: string): string {
  const parsed = new URL(exportUrl);
  const readableSearch = Array.from(
    parsed.searchParams.entries(),
    ([key, value]) => `${key}=${value}`,
  ).join('&');

  return readableSearch
    ? `${parsed.origin}${parsed.pathname}?${readableSearch}`
    : `${parsed.origin}${parsed.pathname}`;
}
