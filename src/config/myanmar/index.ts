import appConfig from './prism.json';
import rawLayers from './layers.json';
// import myanmarTranslation from './translation.json';

const rawTables = {};
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'mmr_admin_boundaries.json',
};
