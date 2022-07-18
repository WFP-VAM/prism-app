import { has, get } from 'lodash';

import { PublicClientApplication } from '@azure/msal-browser';

import cambodia from './cambodia';

import cuba from './cuba';

import ecuador from './ecuador';

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

const configMap = {
  cuba,
  cambodia,
  ecuador,
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

const {
  appConfig,
  rawLayers,
  rawTables,
  defaultUrl: countryBaseURL,
}: {
  defaultUrl?: string;
  appConfig: Record<string, any>;
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

export {
  appConfig,
  rawLayers,
  rawTables,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
  countryBaseURL,
};
