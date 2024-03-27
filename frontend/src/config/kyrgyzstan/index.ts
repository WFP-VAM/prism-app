import appConfig from './prism.json';
import rawLayers from './layers.json';
import russianTranslation from './translation_ru.json';
import kyrgyzTranslation from './translation_ky.json';

const translation = { ru: russianTranslation, ky: kyrgyzTranslation };

const rawTables = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'District_KRYG.json',
};
