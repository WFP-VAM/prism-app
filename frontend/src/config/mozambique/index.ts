import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';
import rawReports from './reports.json';
import mozambiqueTranslation from './translation.json';

const translation = { pt: mozambiqueTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'moz_bnd_adm2_WFP.json',
};
