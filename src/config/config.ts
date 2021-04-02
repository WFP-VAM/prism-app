import {
  mongoliaConfig,
  mongoliaRawLayers,
  mongoliaRawTables,
} from './mongolia';

import {
  indonesiaConfig,
  indonesiaRawLayers,
  indonesiaRawTables,
} from './indonesia';

const DEFAULT = 'mongolia';

const configMap = {
  mongolia: {
    appConfig: mongoliaConfig,
    rawLayers: mongoliaRawLayers,
    rawTables: mongoliaRawTables,
  },
  indonesia: {
    appConfig: indonesiaConfig,
    rawLayers: indonesiaRawLayers,
    rawTables: indonesiaRawTables,
  },
} as const;

type Country = 'mongolia' | 'indonesia';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry = (COUNTRY && Object.keys(configMap).includes(COUNTRY)
  ? COUNTRY
  : DEFAULT) as Country;

const { appConfig, rawLayers, rawTables } = configMap[safeCountry];

export { appConfig, rawLayers, rawTables };
