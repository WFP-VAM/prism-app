import { has, get } from 'lodash';

import { PublicClientApplication } from '@azure/msal-browser';

import cambodia from './cambodia';

import colortest from './colortest';

import cuba from './cuba';

import ecuador from './ecuador';

import global from './global';

import {
  indonesiaConfig,
  indonesiaRawLayers,
  indonesiaRawTables,
} from './indonesia';

import jordan from './jordan';

import kyrgyzstan from './kyrgyzstan';

import {
  mongoliaConfig,
  mongoliaRawLayers,
  mongoliaRawTables,
} from './mongolia';

import mozambique from './mozambique';

import myanmar from './myanmar';

import { namibiaConfig, namibiaRawLayers, namibiaRawTables } from './namibia';

import rbd from './rbd';

import sierraleone from './sierraleone';

import southsudan from './southsudan';

import srilanka from './srilanka';

import {
  tajikistanConfig,
  tajikistanRawLayers,
  tajikistanRawTables,
} from './tajikistan';

import ukraine from './ukraine';

import zimbabwe from './zimbabwe';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  cambodia,
  colortest,
  cuba,
  ecuador,
  global,
  indonesia: {
    appConfig: indonesiaConfig,
    rawLayers: indonesiaRawLayers,
    rawTables: indonesiaRawTables,
    defaultBoundariesFile: 'idn_admin_boundaries.json',
  },
  jordan,
  kyrgyzstan,
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
  southsudan,
  srilanka,
  tajikistan: {
    appConfig: tajikistanConfig,
    rawLayers: tajikistanRawLayers,
    rawTables: tajikistanRawTables,
    defaultBoundariesFile: 'tjk_admin_boundaries_v2.json',
  },
  ukraine,
  zimbabwe,
} as const;

type Country = keyof typeof configMap;

const DEFAULT: Country = 'myanmar';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry =
  COUNTRY && has(configMap, COUNTRY.toLocaleLowerCase())
    ? (COUNTRY.toLocaleLowerCase() as Country)
    : DEFAULT;

const {
  appConfig,
  defaultBoundariesFile,
  rawLayers,
  rawTables,
}: {
  appConfig: Record<string, any>;
  defaultBoundariesFile: string;
  rawLayers: Record<string, any>;
  rawTables: Record<string, any>;
} = configMap[safeCountry];

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
  safeCountry,
  defaultBoundariesPath,
  rawLayers,
  rawTables,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
};
