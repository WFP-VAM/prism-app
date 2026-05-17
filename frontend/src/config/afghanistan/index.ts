import rawLayers from './layers.json';
import appConfig from './prism.json';

const rawTables = {};
// Country-specific translation overrides shared translation
const translation = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'geoBoundaries-AFG-ADM2_w_dv.json',
};
