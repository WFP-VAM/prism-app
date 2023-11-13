import { has, get } from 'lodash';
import { PublicClientApplication } from '@azure/msal-browser';
import afghanistan from './afghanistan';
import cambodia from './cambodia';
import cameroon from './cameroon';
import colombia from './colombia';
import cuba from './cuba';
import ecuador from './ecuador';
import global from './global';
import indonesia from './indonesia';
import jordan from './jordan';
import kyrgyzstan from './kyrgyzstan';
import mongolia from './mongolia';
import mozambique from './mozambique';
import myanmar from './myanmar';
import namibia from './namibia';
import nigeria from './nigeria';
import rbd from './rbd';
import sierraleone from './sierraleone';
import southsudan from './southsudan';
import srilanka from './srilanka';
import tajikistan from './tajikistan';
import tanzania from './tanzania';
import ukraine from './ukraine';
import zimbabwe from './zimbabwe';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

const configMap = {
  afghanistan,
  cambodia,
  cameroon,
  colombia,
  cuba,
  ecuador,
  global,
  indonesia,
  jordan,
  kyrgyzstan,
  mongolia,
  mozambique,
  myanmar,
  namibia,
  nigeria,
  rbd,
  sierraleone,
  southsudan,
  srilanka,
  tajikistan,
  tanzania,
  ukraine,
  zimbabwe,
} as const;

type Country = keyof typeof configMap;

const DEFAULT: Country = 'mozambique';

const {
  REACT_APP_COUNTRY: COUNTRY,
  REACT_APP_OAUTH_CLIENT_ID: CLIENT_ID,
  REACT_APP_OAUTH_AUTHORITY: AUTHORITY,
  REACT_APP_OAUTH_REDIRECT_URI: REDIRECT_URI,
  REACT_APP_TESTING: TESTING,
} = process.env;

const safeCountry =
  COUNTRY && has(configMap, COUNTRY.toLocaleLowerCase())
    ? (COUNTRY.toLocaleLowerCase() as Country)
    : DEFAULT;

const {
  appConfig,
  defaultBoundariesFile,
  rawLayers,
  rawTables,
  rawReports,
}: {
  appConfig: Record<string, any>;
  defaultBoundariesFile: string;
  rawLayers: Record<string, any>;
  rawTables: Record<string, any>;
  rawReports: Record<string, any>;
} = configMap[safeCountry];

const translation = get(configMap[safeCountry], 'translation', {});

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
  rawReports,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
};
