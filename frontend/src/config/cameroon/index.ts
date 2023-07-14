import appConfig from './prism.json';
import rawLayers from './layers.json';
import frTranslation from './translation.json';

const rawTables = {};
const rawReports = {};
const translation = { fr: frTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'cmr_admbnda_adm2_wfp_ocha.json',
};
