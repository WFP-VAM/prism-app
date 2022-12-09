import appConfig from './prism.json';
import rawLayers from './layers.json';
import indonesiaTranslation from './translation.json';

const rawTables = {};
const translation = { id: indonesiaTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'admin_idn.json',
};
