import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const translation = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  translation,
  defaultUrl: 'prism-cuba.org',
  defaultBoundariesFile: 'cub_admbnda_adm2_2019.json',
};
