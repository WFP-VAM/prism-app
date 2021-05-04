import { has } from 'lodash';

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

import {
  tajikistanConfig,
  tajikistanRawLayers,
  tajikistanRawTables,
} from './tajikistan';

import {
  zimbabweConfig,
  zimbabweRawLayers,
  zimbabweRawTables,
} from './zimbabwe';

type Country =
  | 'indonesia'
  | 'mongolia'
  | 'mozambique'
  | 'myanmar'
  | 'tajikistan'
  | 'zimbabwe';

const DEFAULT: Country = 'mongolia';

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
  tajikistan: {
    appConfig: tajikistanConfig,
    rawLayers: tajikistanRawLayers,
    rawTables: tajikistanRawTables,
  },
  zimbabwe: {
    appConfig: zimbabweConfig,
    rawLayers: zimbabweRawLayers,
    rawTables: zimbabweRawTables,
  },
} as const;

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry = (COUNTRY && has(configMap, COUNTRY)
  ? COUNTRY
  : DEFAULT) as Country;

const { appConfig, rawLayers, rawTables } = configMap[safeCountry];

export { appConfig, rawLayers, rawTables };
