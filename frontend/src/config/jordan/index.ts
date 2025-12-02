import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
const translation = { عربى: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'jor_admbnda_adm2_jdos.json',
};
