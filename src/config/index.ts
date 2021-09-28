import { has } from 'lodash';

import {
  cambodiaConfig,
  cambodiaRawLayers,
  cambodiaRawTables,
} from './cambodia';

import {
  indonesiaConfig,
  indonesiaRawLayers,
  indonesiaRawTables,
} from './indonesia';

import {
  kyrgyzstanConfig,
  kyrgyzstanRawLayers,
  kyrgyzstanRawTables,
} from './kyrgyzstan';

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

import { rbdConfig, rbdRawLayers, rbdRawTables } from './rbd';

import {
  tajikistanConfig,
  tajikistanRawLayers,
  tajikistanRawTables,
} from './tajikistan';

type Country =
  | 'cambodia'
  | 'indonesia'
  | 'kyrgyzstan'
  | 'mongolia'
  | 'mozambique'
  | 'myanmar'
  | 'rbd'
  | 'tajikistan';

const DEFAULT: Country = 'myanmar';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  cambodia: {
    appConfig: cambodiaConfig,
    rawLayers: cambodiaRawLayers,
    rawTables: cambodiaRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/khm_bnd_admin3_gov_wfp_edEarly2021.json`,
  },
  indonesia: {
    appConfig: indonesiaConfig,
    rawLayers: indonesiaRawLayers,
    rawTables: indonesiaRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/idn_admin_boundaries.json`,
  },
  kyrgyzstan: {
    appConfig: kyrgyzstanConfig,
    rawLayers: kyrgyzstanRawLayers,
    rawTables: kyrgyzstanRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/kgz_admin_boundaries.json`,
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
  rbd: {
    appConfig: rbdConfig,
    rawLayers: rbdRawLayers,
    rawTables: rbdRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/rbd_admin_boundaries.json`,
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
