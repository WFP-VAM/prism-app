import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';
import rawReports from './reports.json';

const translation = { fr: {}, en: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm3_WFP.json',
};
