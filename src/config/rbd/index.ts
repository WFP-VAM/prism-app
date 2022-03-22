import appConfig from './prism.json';
import rawLayers from './layers.json';
import frTranslation from './translation.json';

const translation = { fr: frTranslation };

const rawTables = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'wca_CHIPC_nov2021_admin1.json',
};
