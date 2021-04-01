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

type Country = 'mongolia' | 'indonesia';

const DEFAULT = 'mongolia';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;

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

const { appConfig, rawLayers, rawTables } = configMap[
  (COUNTRY as Country) || DEFAULT
];

export { appConfig, rawLayers, rawTables };
