const runLocally = !!process.env.REACT_APP_LOCAL;

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
export const EXPORT_API_URL = `${API_URL}/export-map`;
// Default to the VAM URL for HDC data.
export const CHART_API_URL =
  'https://api.earthobservation.vam.wfp.org/stats/admin';
