import { combineURLs } from './utils/url-utils';

const runLocally = !!process.env.REACT_APP_LOCAL;

const DEFAULT_API_URL = runLocally
  ? 'http://localhost'
  : 'https://prism-api.ovio.org';

export const ANALYSIS_API_URL =
  process.env.REACT_APP_ANALYSIS_API_URL ||
  combineURLs(DEFAULT_API_URL, 'stats');

export const ALERT_API_URL =
  process.env.REACT_APP_ALERT_API_URL || combineURLs(DEFAULT_API_URL, 'alerts');

export const KOBO_API_URL =
  process.env.REACT_APP_KOBO_API_URL || combineURLs(DEFAULT_API_URL, 'kobo');
