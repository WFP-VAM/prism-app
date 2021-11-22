import idLayers from './id_layers.json';
import idCategories from './id_categories.json';
import idUiLabels from './id_uilabels.json';
import { LanguageConfig } from '../../language';

export default {
  default: 'en',
  languages: [
    {
      id: 'en',
      label: 'EN',
      layers: {},
      categories: {},
      uiLabels: {},
    },
    {
      id: 'id',
      label: 'ID',
      layers: idLayers,
      categories: idCategories,
      uiLabels: idUiLabels,
    },
  ],
} as LanguageConfig;
