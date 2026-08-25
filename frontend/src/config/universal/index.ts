import { merge } from 'lodash';

import globalLayers from '../global/layers.json';
import boundarySources from '../shared/universal-admin-boundaries.json';
import boundaryViz from './boundary-viz.json';
import appConfig from './prism.json';

const viz = boundaryViz as Record<string, object>;
const boundaries = Object.fromEntries(
  Object.entries(boundarySources).map(([key, source]) => [
    key,
    merge({}, source, viz[key] ?? {}),
  ]),
);

const rawLayers = {
  ...globalLayers,
  ...boundaries,
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
