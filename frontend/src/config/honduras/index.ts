import rawLayers from './layers.json';
import appConfig from './prism.json';
import rawTables from './tables.json';
import rawReports from './reports.json';
const translation = { en: {}, es: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'hnd_admin2_dv.json',
};
