import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'zim_admin2_boundaries_v3_w_dataviz.json',
};
