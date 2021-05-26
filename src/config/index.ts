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

type Country =
  | 'indonesia'
  | 'mongolia'
  | 'mozambique'
  | 'myanmar'
  | 'tajikistan';

const DEFAULT: Country = 'mongolia';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  indonesia: {
    appConfig: indonesiaConfig,
    rawLayers: indonesiaRawLayers,
    rawTables: indonesiaRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/idn_admin_boundaries.json`,
  },
  mongolia: {
    appConfig: mongoliaConfig,
    rawLayers: mongoliaRawLayers,
    rawTables: mongoliaRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/mng_admin_boundaries.json`,
  },
  mozambique: {
    appConfig: mozambiqueConfig,
    rawLayers: mozambiqueRawLayers,
    rawTables: mozambiqueRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/moz_admin_boundaries.json`,
  },
  myanmar: {
    appConfig: myanmarConfig,
    rawLayers: myanmarRawLayers,
    rawTables: myanmarRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/mmr_admin_boundaries.json`,
  },
  tajikistan: {
    appConfig: tajikistanConfig,
    rawLayers: tajikistanRawLayers,
    rawTables: tajikistanRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/tjk_admin_boundaries_v2.json`,
  },
} as const;

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry = (COUNTRY && has(configMap, COUNTRY)
  ? COUNTRY
  : DEFAULT) as Country;

const { appConfig, defaultBoundariesFile, rawLayers, rawTables } = configMap[
  safeCountry
];

export { appConfig, defaultBoundariesFile, rawLayers, rawTables };
