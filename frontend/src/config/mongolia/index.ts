import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';
import mongoliaTranslation from './translation.json';

const rawReports = {};
const translation = { mn: mongoliaTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'mng_adm2_boundaries.json',
};
