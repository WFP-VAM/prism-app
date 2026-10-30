import type { FeatureCollection } from 'geojson';

export type AnalysisZonesPayload =
  | { zones_url: string }
  | { zones: FeatureCollection };

/**
 * Chooses how `/stats` receives admin zones.
 *
 * A remote path or an explicit zones path (including PMTiles parquet on S3)
 * is sent as `zones_url`. On localhost, a relative boundary file is loaded
 * in the browser and sent as GeoJSON, because the API cannot fetch localhost.
 */
export async function resolveAnalysisZones({
  zonesPath,
  adminBoundariesPath,
  isLocal,
  loadLocalZones,
  publicZonesUrl,
}: {
  zonesPath?: string;
  adminBoundariesPath: string;
  isLocal: boolean;
  loadLocalZones: (path: string) => Promise<FeatureCollection>;
  publicZonesUrl: (path: string) => string;
}): Promise<AnalysisZonesPayload> {
  if (zonesPath) {
    return { zones_url: zonesPath };
  }
  if (!isLocal || adminBoundariesPath.startsWith('http')) {
    return { zones_url: publicZonesUrl(adminBoundariesPath) };
  }
  return { zones: await loadLocalZones(adminBoundariesPath) };
}
