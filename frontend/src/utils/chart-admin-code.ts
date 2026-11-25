import { appConfig } from 'config';
import { WMSLayerProps } from 'config/types';
import { resolveChartBoundaryProperty } from 'utils/universal-utils';

/**
 * Resolve the HDC id_code for a chart at the given admin level.
 *
 * Prefers adm{n} id on the boundary feature. The country-level HDC id is
 * only used as a fallback for the country level (0): sending it with a
 * subnational level (e.g. level=2&id_code=<country id>) makes the HDC stats
 * API fail, so features with a null adm{n}_id get no code instead.
 */
export function getChartAdminCode(
  chartLayer: WMSLayerProps,
  properties: GeoJSON.GeoJsonProperties | undefined,
  chartLevel: number,
  countryAdmin0Id: number | undefined,
): number | undefined {
  const levelEntry = chartLayer.chartData?.levels.find(
    entry => Number(entry.level) === chartLevel,
  );
  const resolvedId = levelEntry
    ? resolveChartBoundaryProperty(properties, levelEntry.id)
    : undefined;

  if (resolvedId) {
    return resolvedId as number;
  }
  if (chartLevel === 0) {
    return countryAdmin0Id ?? appConfig.countryAdmin0Id;
  }
  return undefined;
}
