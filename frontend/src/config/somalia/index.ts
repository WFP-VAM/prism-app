import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawDashboards from './dashboards.json';

const rawTables = {};
const rawReports = {};
// Country-specific translation overrides shared translation
const translation = { so: {}, en: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  rawDashboards,
  translation,
  defaultBoundariesFile: 'som_admbnda_adm2_ocha_20230308_dv.json',
};
