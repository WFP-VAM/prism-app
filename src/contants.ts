import { combineURLs } from './utils/url-utils';

const DEFAULT_API_URL = 'https://prism-api.ovio.org';

export const ANALYSIS_API_URL =
  process.env.REACT_APP_ANALYSIS_API_URL ||
  combineURLs(DEFAULT_API_URL, 'stats');

export const KOBO_API_URL =
  process.env.REACT_APP_KOBO_API_URL || DEFAULT_API_URL;
