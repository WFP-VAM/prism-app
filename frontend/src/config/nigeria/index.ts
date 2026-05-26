import rawLayers from './layers.json';
import appConfig from './prism.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'nga_admbnda_adm2_osgof_20190417.json',
};
