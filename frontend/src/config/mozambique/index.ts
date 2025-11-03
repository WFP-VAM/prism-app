import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';

const translation = { pt: {}, en: {} };
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawReports,
  rawTables,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm3_WFP.json',
};
