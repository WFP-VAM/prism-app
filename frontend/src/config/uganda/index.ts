import rawLayers from './layers.json';
import appConfig from './prism.json';

const rawTables = {};
const rawReports = {};

const translation = { en: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'uga_admbnda_adm2.json',
};
