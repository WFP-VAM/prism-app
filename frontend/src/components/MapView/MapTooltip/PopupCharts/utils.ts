import { appConfig } from 'config';
import { WMSLayerProps } from 'config/types';
import { resolveChartBoundaryProperty } from 'utils/universal-utils';

/**
 * Whether a tooltip chart row can resolve an HDC id_code for the given
 * admin level. Mirrors useChartData: prefer dv_adm{n}_id on the clicked
 * feature, then fall back to the country-level HDC id.
 *
 * Returns true when properties are missing so the legacy popup path
 * (no captured feature properties) keeps showing chart rows.
 */
export function hasChartAdminId(
  chartLayer: WMSLayerProps,
  properties: GeoJSON.GeoJsonProperties | undefined,
  chartLevel: number,
  countryAdmin0Id: number | undefined,
): boolean {
  if (!properties) {
    return true;
  }

  const fallbackId = countryAdmin0Id ?? appConfig.countryAdmin0Id;
  const levelEntry = chartLayer.chartData?.levels.find(
    entry => Number(entry.level) === chartLevel,
  );
  const resolvedId = levelEntry
    ? resolveChartBoundaryProperty(properties, levelEntry.id)
    : undefined;

  return Boolean(resolvedId) || Boolean(fallbackId);
}
