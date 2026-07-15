import globalLayers from '../global/layers.json';
import rawBoundaryLayers from './layers.json';
import appConfig from './prism.json';

const rawLayers = {
  ...globalLayers,
  ...rawBoundaryLayers,
};

const rawTables = {};
const rawReports = {};
const translation = {
  // UN-6 sidecar languages; empty objects inherit shared UI strings from config/shared.
  fr: {},
  es: {},
  ar: {},
  ru: {},
  zh: {},
};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'universal_admin_boundaries_placeholder.json',
};

export { default as universalMetadata } from './metadata.json';
