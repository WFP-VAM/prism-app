import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const translation = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'lka_bnd_adm3.json',
};
