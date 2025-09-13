import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const rawReports = {};

// Temp: hack for Malawi window labels
const translation = {
  en: {
    'Window 1': 'NDJ',
    'Window 2': 'JFM',
  },
};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'mwi_bnd_adm2_ge.json',
};
