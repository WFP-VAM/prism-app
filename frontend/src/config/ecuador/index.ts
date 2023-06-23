import appConfig from './prism.json';
import rawLayers from './layers.json';
import ecuadorTranslation from './translation.json';

const rawTables = {};
const rawReports = {};
const translation = { es: ecuadorTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'ecu_admbnda_adm2.json',
};
