import { isCustomRatio } from 'components/MapExport/aspectRatioConstants';
import type { AspectRatio, MapExportToggles } from 'components/MapExport/types';
import { AdminCodeString, LayerKey } from 'config/types';
import type { LngLatBounds } from 'maplibre-gl';

export interface BuildBatchExportUrlsParams {
  pageUrl: string;
  layerId: LayerKey;
  formattedDates: string[];
  mapBounds: LngLatBounds | null;
  mapZoom: number | null;
  aspectRatio: AspectRatio;
  titleText: string;
  footerText: string;
  footerTextSize: number;
  logoPosition: number;
  logoScale: number;
  legendPosition: number;
  legendScale: number;
  bottomLogoScale: number;
  toggles: MapExportToggles;
  selectedBoundaries: AdminCodeString[];
}

function appendExportToggleParams(
  params: URLSearchParams,
  toggles: MapExportToggles,
): void {
  params.delete('toggles');
  params.set('fullLayerDescription', String(toggles.fullLayerDescription));
  params.set('countryMask', String(toggles.countryMask));
  params.set('mapLabelsVisibility', String(toggles.mapLabelsVisibility));
  params.set('logoVisibility', String(toggles.logoVisibility));
  params.set('legendVisibility', String(toggles.legendVisibility));
  params.set('footerVisibility', String(toggles.footerVisibility));
  params.set(
    'bottomLogoVisibility',
    String(toggles.bottomLogoVisibility ?? true),
  );
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

export function buildBatchExportUrls({
  pageUrl,
  layerId,
  formattedDates,
  mapBounds,
  mapZoom,
  aspectRatio,
  titleText,
  footerText,
  footerTextSize,
  logoPosition,
  logoScale,
  legendPosition,
  legendScale,
  bottomLogoScale,
  toggles,
  selectedBoundaries,
}: BuildBatchExportUrlsParams): string[] {
  const { origin, pathname, search } = new URL(pageUrl);
  const exportPath = `${pathname.replace(/\/$/, '')}/export`;
  const baseParams = new URLSearchParams(search);

  return formattedDates
    .filter((date): date is string => date !== undefined)
    .map(date => {
      const params = new URLSearchParams(baseParams);
      params.set('date', date);
      params.set('hazardLayerIds', layerId);
      params.delete('baselineLayerId');

      if (mapBounds) {
        const bounds = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
        params.set('bounds', bounds);
      }
      if (mapZoom != null) {
        params.set('zoom', String(mapZoom));
      }

      params.set('mapWidth', '100');
      params.set('mapHeight', '100');
      if (isCustomRatio(aspectRatio)) {
        params.set('aspectRatio', 'Custom');
        params.set('customWidth', String(aspectRatio.w));
        params.set('customHeight', String(aspectRatio.h));
      } else {
        params.set('aspectRatio', aspectRatio);
      }
      params.set('title', titleText);
      params.set('footer', footerText);
      params.set('footerTextSize', String(footerTextSize));
      params.set('logoPosition', String(logoPosition));
      params.set('logoScale', String(logoScale));
      params.set('legendPosition', String(legendPosition));
      params.set('legendScale', String(legendScale));
      params.set('bottomLogoScale', String(bottomLogoScale));
      appendExportToggleParams(params, toggles);

      if (selectedBoundaries.length > 0) {
        params.set('selectedBoundaries', selectedBoundaries.join(','));
      }

      return `${origin}${exportPath}?${params.toString()}`;
    });
}
