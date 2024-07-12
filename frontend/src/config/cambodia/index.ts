import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawReports from './reports.json';

const rawTables = {};
const translation = { kh: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'khm_bnd_admin3_gov_ed2022.json',
};
