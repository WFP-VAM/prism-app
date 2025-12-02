import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
// Country-specific translation overrides shared translation
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
