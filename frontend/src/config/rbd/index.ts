import appConfig from './prism.json';
import rawLayers from './layers.json';
import frTranslation from './translation.json';

const translation = { fr: frTranslation };

const rawTables = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'wca_admbnda_adm2_ocha.json',
};
