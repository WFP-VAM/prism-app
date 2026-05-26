import rawLayers from './layers.json';
import appConfig from './prism.json';
import rawReports from './reports.json';

const rawTables = {};
// Country-specific translation overrides shared translation
const translation = { km: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'khm_bnd_admin3_gov_ed2022.json',
};
