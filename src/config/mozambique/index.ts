import appConfig from './prism.json';
import rawLayers from './layers.json';
import mozambiqueTranslation from './translation.json';

const rawTables = {};
const translation = { pt: mozambiqueTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm2_WFP.json',
};
