import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';
import rawDashboards from './dashboards.json';

// Country-specific translation overrides shared translation
const translation = { pt: {}, en: { 'Admin 1': 'Province' } };
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawReports,
  rawTables,
  rawDashboards,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm3_WFP.json',
};
