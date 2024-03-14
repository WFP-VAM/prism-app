import { has, get } from 'lodash';

import { PublicClientApplication } from '@azure/msal-browser';

import cambodia from './cambodia';
import cuba from './cuba';
import global from './global';
import indonesia from './indonesia';
import kyrgyzstan from './kyrgyzstan';
import mongolia from './mongolia';
import mozambique from './mozambique';
import myanmar from './myanmar';
import namibia from './namibia';
import rbd from './rbd';
import srilanka from './srilanka';
import sierraleone from './sierraleone';
import tajikistan from './tajikistan';
import zimbabwe from './zimbabwe';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  cambodia,
  cuba,
  global,
  indonesia,
  kyrgyzstan,
  mongolia,
  mozambique,
  myanmar,
  namibia,
  rbd,
  sierraleone,
  srilanka,
  tajikistan,
  zimbabwe,
} as const;

type Country = keyof typeof configMap;

const DEFAULT: Country = 'myanmar';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;
const safeCountry =
  COUNTRY && has(configMap, COUNTRY) ? (COUNTRY as Country) : DEFAULT;

const {
  appConfig,
  defaultBoundariesFile,
  rawLayers,
  rawTables,
  translation,
} = configMap[safeCountry];

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
