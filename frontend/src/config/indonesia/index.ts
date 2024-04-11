import appConfig from './prism.json';
import indonesiaRawLayers from './layers.json';

const rawReports = {};
const translation = {};

export default {
  appConfig,
  rawLayers: indonesiaRawLayers,
  rawTables: {},
  rawReports,
  translation,
  defaultBoundariesFile: 'idn_bnd_adm2_WFP.json',
};
