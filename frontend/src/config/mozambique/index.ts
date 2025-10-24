import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';

const translation = { pt: {}, en: {} };

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm3_WFP.json',
};
