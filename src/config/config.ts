import {
  indonesiaConfig,
  indonesiaRawLayers,
  indonesiaRawTables,
} from './indonesia';

import {
  mongoliaConfig,
  mongoliaRawLayers,
  mongoliaRawTables,
} from './mongolia';

import {
  mozambiqueConfig,
  mozambiqueRawLayers,
  mozambiqueRawTables,
} from './mozambique';

import { myanmarConfig, myanmarRawLayers, myanmarRawTables } from './myanmar';

const DEFAULT = 'mongolia';

const configMap = {
  indonesia: {
    appConfig: indonesiaConfig,
    rawLayers: indonesiaRawLayers,
    rawTables: indonesiaRawTables,
  },
  mongolia: {
    appConfig: mongoliaConfig,
    rawLayers: mongoliaRawLayers,
    rawTables: mongoliaRawTables,
  },
  mozambique: {
    appConfig: mozambiqueConfig,
    rawLayers: mozambiqueRawLayers,
    rawTables: mozambiqueRawTables,
  },
  myanmar: {
    appConfig: myanmarConfig,
    rawLayers: myanmarRawLayers,
    rawTables: myanmarRawTables,
  },
} as const;

type Country = 'mongolia' | 'indonesia';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry = (COUNTRY && Object.keys(configMap).includes(COUNTRY)
  ? COUNTRY
  : DEFAULT) as Country;

const { appConfig, rawLayers, rawTables } = configMap[safeCountry];

export { appConfig, rawLayers, rawTables };
