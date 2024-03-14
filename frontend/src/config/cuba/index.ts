import appConfig from './prism.json';
import rawLayers from './layers.json';
import cubaTranslation from './translation.json';

const rawTables = {};
const rawReports = {};
const translation = { es: cubaTranslation };

export default {
  appConfig,
  rawLayers,
  rawReports,
  rawTables,
  translation,
  defaultBoundariesFile: 'cub_admbnda_adm2_2019.json',
};
