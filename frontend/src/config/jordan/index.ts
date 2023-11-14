import appConfig from './prism.json';
import rawLayers from './layers.json';
import jordanTranslation from './translation.json';

const rawTables = {};
const rawReports = {};
const translation = { عربى: jordanTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'jor_admbnda_adm2_jdos.json',
};
