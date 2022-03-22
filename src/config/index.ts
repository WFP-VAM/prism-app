import { has, get } from 'lodash';

import { PublicClientApplication } from '@azure/msal-browser';

import cambodia from './cambodia';

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

import myanmar from './myanmar';

import { namibiaConfig, namibiaRawLayers, namibiaRawTables } from './namibia';

import rbd from './rbd';

import {
  srilankaConfig,
  srilankaRawLayers,
  srilankaRawTables,
} from './srilanka';

import sierraleone from './sierraleone';

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

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  cambodia,
  global: {
    appConfig: globalConfig,
    rawLayers: globalRawLayers,
    rawTables: globalRawTables,
    defaultBoundariesFile: 'adm0_simplified.json',
  },
  indonesia: {
    appConfig: indonesiaConfig,
    rawLayers: indonesiaRawLayers,
    rawTables: indonesiaRawTables,
    defaultBoundariesFile: 'idn_admin_boundaries.json',
  },
  kyrgyzstan: {
    appConfig: kyrgyzstanConfig,
    rawLayers: kyrgyzstanRawLayers,
    rawTables: kyrgyzstanRawTables,
    defaultBoundariesFile: 'kgz_admin_boundaries.json',
  },
  mongolia: {
    appConfig: mongoliaConfig,
    rawLayers: mongoliaRawLayers,
    rawTables: mongoliaRawTables,
    defaultBoundariesFile: 'mng_admin_boundaries.json',
  },
  mozambique: {
    appConfig: mozambiqueConfig,
    rawLayers: mozambiqueRawLayers,
    rawTables: mozambiqueRawTables,
    defaultBoundariesFile: 'moz_admin_boundaries.json',
  },
  myanmar,
  namibia: {
    appConfig: namibiaConfig,
    rawLayers: namibiaRawLayers,
    rawTables: namibiaRawTables,
    defaultBoundariesFile: 'nam_admin2.json',
  },
  rbd,
  sierraleone,
  srilanka: {
    appConfig: srilankaConfig,
    rawLayers: srilankaRawLayers,
    rawTables: srilankaRawTables,
    defaultBoundariesFile: 'lka_boundaries_admin3.json',
  },
  tajikistan: {
    appConfig: tajikistanConfig,
    rawLayers: tajikistanRawLayers,
    rawTables: tajikistanRawTables,
    defaultBoundariesFile: 'tjk_admin_boundaries_v2.json',
  },
  zimbabwe: {
    appConfig: zimbabweConfig,
    rawLayers: zimbabweRawLayers,
    rawTables: zimbabweRawTables,
    // TODO - Add selected defaultBoundary to S3
    defaultBoundariesFile: '',
  },
} as const;

type Country = keyof typeof configMap;

const DEFAULT: Country = 'myanmar';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry =
  COUNTRY && has(configMap, COUNTRY) ? (COUNTRY as Country) : DEFAULT;

const { appConfig, defaultBoundariesFile, rawLayers, rawTables } = configMap[
  safeCountry
];

const translation = get(configMap[safeCountry], 'translation', {});

const {
  REACT_APP_OAUTH_CLIENT_ID: CLIENT_ID,
  REACT_APP_OAUTH_AUTHORITY: AUTHORITY,
  REACT_APP_OAUTH_REDIRECT_URI: REDIRECT_URI,
} = process.env;

const msalConfig = {
  auth: {
    clientId: CLIENT_ID!,
    authority: AUTHORITY!,
    redirectUri: REDIRECT_URI!,
  },
};

const msalRequest = {
  scopes: ['openid', 'profile'],
};

const msalInstance = new PublicClientApplication(msalConfig);

const enableNavigationDropdown = get(
  appConfig,
  'enableNavigationDropdown',
  false,
);

const defaultBoundariesPath = `${DEFAULT_BOUNDARIES_FOLDER}/${defaultBoundariesFile}`;

export {
  appConfig,
  defaultBoundariesPath,
  rawLayers,
  rawTables,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
};
