import { has, get, merge } from 'lodash';
import { PublicClientApplication } from '@azure/msal-browser';
import shared from './shared';
import afghanistan from './afghanistan';
import bhutan from './bhutan';
import cambodia from './cambodia';
import cameroon from './cameroon';
import colombia from './colombia';
import cuba from './cuba';
import ecuador from './ecuador';
import global from './global';
import haiti from './haiti';
import indonesia from './indonesia';
import jordan from './jordan';
import kyrgyzstan from './kyrgyzstan';
import malawi from './malawi';
import mongolia from './mongolia';
import mozambique from './mozambique';
import myanmar from './myanmar';
import namibia from './namibia';
import nepal from './nepal';
import nigeria from './nigeria';
import rbd from './rbd';
import sierraleone from './sierraleone';
import somalia from './somalia';
import southsudan from './southsudan';
import srilanka from './srilanka';
import sudan from './sudan';
import tajikistan from './tajikistan';
import tanzania from './tanzania';
import ukraine from './ukraine';
import zambia from './zambia';
import zimbabwe from './zimbabwe';
// list countries that have a preprocessed-layer-dates.json file
// to avoid a failed network call on each layer activation
import countriesWithPreprocessedDates from './countriesWithPreprocessedDates.json';

// Upload the boundary URL to S3 to enable the use of the API in a local environment.
const DEFAULT_BOUNDARIES_FOLDER =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com';

export const configMap = {
  afghanistan,
  bhutan,
  cambodia,
  cameroon,
  colombia,
  cuba,
  ecuador,
  global,
  haiti,
  indonesia,
  jordan,
  kyrgyzstan,
  malawi,
  mongolia,
  mozambique,
  myanmar,
  namibia,
  nepal,
  nigeria,
  rbd,
  sierraleone,
  somalia,
  southsudan,
  srilanka,
  sudan,
  tajikistan,
  tanzania,
  ukraine,
  zambia,
  zimbabwe,
} as const;

export type Country = keyof typeof configMap;

const DEFAULT: Country = 'mozambique';

const {
  REACT_APP_COUNTRY: COUNTRY,
  REACT_APP_OAUTH_CLIENT_ID: CLIENT_ID,
  REACT_APP_OAUTH_AUTHORITY: AUTHORITY,
  REACT_APP_OAUTH_REDIRECT_URI: REDIRECT_URI,
  REACT_APP_TESTING: TESTING,
  REACT_APP_QA_MODE: QA_MODE,
} = process.env;

const safeCountry =
  COUNTRY && has(configMap, COUNTRY.toLocaleLowerCase())
    ? (COUNTRY.toLocaleLowerCase() as Country)
    : DEFAULT;

const {
  defaultBoundariesFile,
  rawTables,
  rawReports,
  rawDashboards,
}: {
  defaultBoundariesFile: string;
  rawTables: Record<string, any>;
  rawReports: Record<string, any>;
  rawDashboards?: any[];
} = configMap[safeCountry];

const {
  defaultConfig,
  sharedLayers,
  translation: sharedTranslation,
  sharedLegends,
} = shared;

// Perform deep merges between shared and country-specific configurations
const appConfig: Record<string, any> = merge(
  {},
  defaultConfig,
  configMap[safeCountry].appConfig,
  // Add dashboards to appConfig if available
  rawDashboards && rawDashboards.length > 0
    ? { dashboards: rawDashboards }
    : {},
);

export function getRawLayers(
  country: Country,
  filter = false,
): Record<string, any> {
  const countryLayerIds = JSON.stringify(get(configMap, country, {}));

  return Object.fromEntries(
    Object.entries(
      merge(
        {},
        // we initialize with country layers to maintain the order
        configMap[country].rawLayers,
        sharedLayers,
        configMap[country].rawLayers,
      ),
    )
      // Filter layers that appear in the country config
      .filter(([key, _layer]) => !filter || countryLayerIds.includes(key))
      .map(([key, layer]) => {
        if (typeof layer.legend === 'string') {
          if (!sharedLegends[layer.legend]) {
            throw new Error(
              `Legend '${layer.legend}' could not be found in shared legends.`,
            );
          }
          // eslint-disable-next-line no-param-reassign, fp/no-mutation
          layer.legend = sharedLegends[layer.legend] || layer.legend;
        }
        return [key, layer];
      }),
  );
}

// Translation priority order (later values override earlier):
// 1. Base: sharedTranslation[key] (shared language files from config/shared)
// 2. Override: value (country-specific translation overrides shared)
export function getTranslation(country: Country): Record<string, any> {
  const countryTranslation = get(configMap[country], 'translation', {});
  return Object.fromEntries(
    Object.entries(
      QA_MODE || TESTING
        ? merge({}, sharedTranslation, countryTranslation)
        : countryTranslation,
    ).map(([key, value]) => [
      key,
      merge({}, sharedTranslation[key] || {}, value),
    ]),
  );
}

const rawLayers = getRawLayers(safeCountry);
const translation = getTranslation(safeCountry);

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
  countriesWithPreprocessedDates,
  safeCountry,
  defaultBoundariesPath,
  rawLayers,
  rawTables,
  rawReports,
  rawDashboards,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
};
