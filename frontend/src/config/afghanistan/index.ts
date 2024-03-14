import appConfig from './prism.json';
import rawLayers from './layers.json';

const rawTables = {};
const translation = {};
const rawReports = {};

export default {
  appConfig,
  rawLayers,
  rawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'geoBoundaries-AFG-ADM1-extended.json',
};
