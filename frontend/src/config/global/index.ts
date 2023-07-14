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
  defaultBoundariesFile: 'adm0_simplified.json',
};
