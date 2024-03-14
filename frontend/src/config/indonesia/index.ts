import appConfig from './prism.json';
import indonesiaRawLayers from './layers.json';
import indonesiaRawTables from './tables.json';

const rawReports = {};
const translation = {};

export default {
  appConfig,
  rawLayers: indonesiaRawLayers,
  rawTables: indonesiaRawTables,
  rawReports,
  translation,
  defaultBoundariesFile: 'idn_admin_boundaries.json',
};
