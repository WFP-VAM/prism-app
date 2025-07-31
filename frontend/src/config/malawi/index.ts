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
  defaultBoundariesFile: 'mwi_bnd_adm2_ge.json',
};
