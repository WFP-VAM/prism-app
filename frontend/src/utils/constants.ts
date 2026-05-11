const runLocally = !!process.env.REACT_APP_LOCAL;

const LOCAL_EXPORT_PAGE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Origin embedded in map export job URLs. Backend cannot fetch loopback; use public PRISM host when UI runs on localhost. */
export function getMapExportPageOrigin(pageUrl: URL): string {
  if (LOCAL_EXPORT_PAGE_HOSTS.has(pageUrl.hostname)) {
    return 'https://prism.moz.wfp.org';
  }
  return pageUrl.origin;
}

const DEFAULT_API_URL = runLocally
  ? 'http://localhost'
  : 'https://prism-api.ovio.org';

// Allow generalized override of the URL and remove trailing slash
const API_URL = (process.env.REACT_APP_API_URL || DEFAULT_API_URL).replace(
  /\/$/,
  '',
);

export const ANALYSIS_API_URL = `${API_URL}/stats`;
export const ALERT_API_URL = `${API_URL}/alerts`;
export const KOBO_API_URL = `${API_URL}/kobo`;
export const RASTER_API_URL = `${API_URL}/raster_geotiff`;
export const EXPORT_MAP_JOBS_API_URL = `${API_URL}/export-map/jobs`;
// Default to the VAM URL for HDC data.
export const CHART_API_URL =
  'https://api.earthobservation.vam.wfp.org/stats/admin';
