import { isCustomRatio } from 'components/MapExport/aspectRatioConstants';
import type { BuildBatchExportUrlsInput } from './types';

export function buildBatchExportUrls(
  input: BuildBatchExportUrlsInput,
): string[] {
  const {
    formattedDates,
    origin,
    exportPath,
    baseSearchParams,
    printSelectedLayer,
    mapBounds,
    mapZoom,
    mapDimensions,
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
  } = input;

  return formattedDates
    .filter((date): date is string => date !== undefined)
    .map(date => {
      const params = new URLSearchParams(baseSearchParams);
      params.set('date', date);
      params.set('hazardLayerIds', printSelectedLayer.id);
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

      if (isCustomRatio(mapDimensions.aspectRatio)) {
        params.set('aspectRatio', 'Custom');
        params.set('customWidth', String(mapDimensions.aspectRatio.w));
        params.set('customHeight', String(mapDimensions.aspectRatio.h));
      } else {
        params.set('aspectRatio', mapDimensions.aspectRatio);
      }
      params.set('title', titleText);
      params.set('footer', footerText);
      params.set('footerTextSize', String(footerTextSize));

      params.set('logoPosition', String(logoPosition));
      params.set('logoScale', String(logoScale));
      params.set('legendPosition', String(legendPosition));
      params.set('legendScale', String(legendScale));
      params.set('bottomLogoScale', String(bottomLogoScale));

      const exportToggles = {
        fullLayerDescription: toggles.fullLayerDescription,
        countryMask: toggles.countryMask,
        mapLabelsVisibility: toggles.mapLabelsVisibility,
        logoVisibility: toggles.logoVisibility,
        legendVisibility: toggles.legendVisibility,
        footerVisibility: toggles.footerVisibility,
        bottomLogoVisibility: toggles.bottomLogoVisibility,
      };
      params.set('toggles', JSON.stringify(exportToggles));

      if (selectedBoundaries.length > 0) {
        params.set('selectedBoundaries', selectedBoundaries.join(','));
      }

      return `${origin}${exportPath}?${params.toString()}`;
    });
}
