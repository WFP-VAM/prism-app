import { has, get } from 'lodash';

import { PublicClientApplication } from '@azure/msal-browser';

import cambodia from './cambodia';

import colombia from './colombia';

import cuba from './cuba';

import ecuador from './ecuador';

import global from './global';

import indonesia from './indonesia';

import jordan from './jordan';

import kyrgyzstan from './kyrgyzstan';

import {
  mongoliaConfig,
  mongoliaRawLayers,
  mongoliaRawTables,
} from './mongolia';

import mozambique from './mozambique';

import myanmar from './myanmar';

import namibia from './namibia';

import rbd from './rbd';

import sierraleone from './sierraleone';

import southsudan from './southsudan';

import srilanka from './srilanka';

import tajikistan from './tajikistan';

import ukraine from './ukraine';

import zimbabwe from './zimbabwe';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  cuba,
  cambodia,
  colombia,
  ecuador,
  global,
  indonesia,
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
  namibia,
  rbd,
  sierraleone,
  southsudan,
  srilanka,
  tajikistan,
  ukraine,
  zimbabwe,
} as const;

type Country = keyof typeof configMap;

const DEFAULT: Country = 'mozambique';

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
  REACT_APP_TESTING: TESTING,
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

const authRequired: boolean =
  !TESTING && get(appConfig, 'WFPAuthRequired', false);

const enableNavigationDropdown: boolean = get(
  appConfig,
  'enableNavigationDropdown',
  false,
);

const defaultBoundariesPath = `${DEFAULT_BOUNDARIES_FOLDER}/${defaultBoundariesFile}`;

export {
  appConfig,
  authRequired,
  safeCountry,
  defaultBoundariesPath,
  rawLayers,
  rawTables,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
};
