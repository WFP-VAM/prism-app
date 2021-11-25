import { has } from 'lodash';

import {
  cambodiaConfig,
  cambodiaRawLayers,
  cambodiaRawTables,
} from './cambodia';

import { globalConfig, globalRawLayers, globalRawTables } from './global';

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

import { namibiaConfig, namibiaRawLayers, namibiaRawTables } from './namibia';

import { rbdConfig, rbdRawLayers, rbdRawTables } from './rbd';

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
  | 'cambodia'
  | 'global'
  | 'indonesia'
  | 'kyrgyzstan'
  | 'mongolia'
  | 'mozambique'
  | 'myanmar'
  | 'namibia'
  | 'rbd'
  | 'tajikistan'
  | 'zimbabwe';

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
  global: {
    appConfig: globalConfig,
    rawLayers: globalRawLayers,
    rawTables: globalRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/adm0_simplified.json`,
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
  namibia: {
    appConfig: namibiaConfig,
    rawLayers: namibiaRawLayers,
    rawTables: namibiaRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/nam_admin2.json`,
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
  zimbabwe: {
    appConfig: zimbabweConfig,
    rawLayers: zimbabweRawLayers,
    rawTables: zimbabweRawTables,
    // TODO - Add selected defaultBoundary to S3
    defaultBoundariesFile: '',
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
