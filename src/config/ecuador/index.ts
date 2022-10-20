import appConfig from './prism.json';
import rawLayers from './layers.json';
import ecuadorTranslation from './translation.json';

const rawTables = {};
const translation = { es: ecuadorTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'ecu_admbnda_adm2.json',
};
