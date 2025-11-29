import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawReports from './reports.json';
// import myanmarTranslation from './translation.json';

const rawTables = {};
// Country-specific translation overrides shared translation
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'mmr_polbnda_adm3_250k_mimu.json',
};
