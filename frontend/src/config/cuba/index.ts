import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
const translation = { es: {} };

export default {
  appConfig,
  rawLayers,
  rawReports,
  rawTables,
  translation,
  defaultBoundariesFile: 'cub_admbnda_adm2_2019.json',
};
