import appConfig from './prism.json';
import rawLayers from './layers.json';

const translation = { ru: {}, ky: {} };

const rawTables = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'District_KRYG.json',
};
