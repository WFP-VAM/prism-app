import appConfig from './prism.json';
import rawLayers from './layers.json';
import rawTables from './tables.json';
import mongoliaTranslation from './translation.json';

const translation = { mn: mongoliaTranslation };

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultBoundariesFile: 'admin_boundaries.json',
};
