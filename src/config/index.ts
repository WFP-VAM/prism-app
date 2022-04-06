import { has, get } from 'lodash';

import { PublicClientApplication } from '@azure/msal-browser';

import cambodia from './cambodia';

import {
  cubaConfig,
  cubaRawLayers,
  cubaRawTables,
} from './cuba';

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

import mozambique from './mozambique';

import myanmar from './myanmar';

import { namibiaConfig, namibiaRawLayers, namibiaRawTables } from './namibia';

import rbd from './rbd';

import srilanka from './srilanka';

import sierraleone from './sierraleone';

import {
  tajikistanConfig,
  tajikistanRawLayers,
  tajikistanRawTables,
} from './tajikistan';

import zimbabwe from './zimbabwe';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  cuba: {
    appConfig: cubaConfig,
    rawLayers: cubaRawLayers,
    rawTables: cubaRawTables,
    defaultBoundariesFile: `${DEFAULT_BOUNDARIES_FOLDER}/cub_admbnda_adm2_2019.json`,
  },
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
  mozambique,
  myanmar,
  namibia: {
    appConfig: namibiaConfig,
    rawLayers: namibiaRawLayers,
    rawTables: namibiaRawTables,
    defaultBoundariesFile: 'nam_admin2.json',
  },
  rbd,
  sierraleone,
  srilanka,
  tajikistan: {
    appConfig: tajikistanConfig,
    rawLayers: tajikistanRawLayers,
    rawTables: tajikistanRawTables,
    defaultBoundariesFile: 'tjk_admin_boundaries_v2.json',
  },
  zimbabwe,
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
