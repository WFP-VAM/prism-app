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

/**
 * Determines the current country based on environment variable or URL path.
 * If the URL path starts with '/country', returns 'global' for multi-country mode.
 */
function getCurrentCountry(): Country {
  // Check if we're on the /country route (multi-country mode)
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/country')
  ) {
    return 'global';
  }

  // Otherwise use the environment variable or default
  return COUNTRY && has(configMap, COUNTRY.toLocaleLowerCase())
    ? (COUNTRY.toLocaleLowerCase() as Country)
    : DEFAULT;
}

/**
 * Gets the current safe country (reactive to URL changes).
 * Export as a getter function for reactivity.
 */
function getSafeCountry(): Country {
  return getCurrentCountry();
}

// For backward compatibility, create a getter that can be used as a value
// Note: Components will need to call this function when route changes
const safeCountry = getSafeCountry();

const {
  defaultConfig,
  sharedLayers,
  translation: sharedTranslation,
  sharedLegends,
} = shared;

/**
 * Gets the current country config based on the URL path.
 * Returns the appropriate config object.
 */
function getCurrentCountryConfig() {
  const currentCountry = getCurrentCountry();
  return configMap[currentCountry];
}

/**
 * Gets appConfig for the current country (based on URL or env var).
 * This is reactive to URL changes.
 */
function getAppConfig(): Record<string, any> {
  const currentCountry = getCurrentCountry();
  return merge({}, defaultConfig, configMap[currentCountry].appConfig);
}

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

/**
 * Gets raw layers for the current country (based on URL or env var).
 */
function getCurrentRawLayers() {
  const currentCountry = getCurrentCountry();
  return getRawLayers(currentCountry);
}

/**
 * Gets translation for the current country (based on URL or env var).
 */
function getCurrentTranslation() {
  const currentCountry = getCurrentCountry();
  return getTranslation(currentCountry);
}

// Create getters for backward compatibility and reactivity
// These will re-evaluate when accessed, checking the current URL
const rawLayers = new Proxy({} as ReturnType<typeof getRawLayers>, {
  get: (_, prop) => {
    const currentLayers = getCurrentRawLayers();
    return currentLayers[prop as keyof typeof currentLayers];
  },
  ownKeys: () => Reflect.ownKeys(getCurrentRawLayers()),
  getOwnPropertyDescriptor: (_, prop) => {
    const currentLayers = getCurrentRawLayers();
    return Reflect.getOwnPropertyDescriptor(currentLayers, prop);
  },
});

const translation = new Proxy({} as ReturnType<typeof getTranslation>, {
  get: (_, prop) => {
    const currentTranslation = getCurrentTranslation();
    return currentTranslation[prop as keyof typeof currentTranslation];
  },
  ownKeys: () => Reflect.ownKeys(getCurrentTranslation()),
  getOwnPropertyDescriptor: (_, prop) => {
    const currentTranslation = getCurrentTranslation();
    return Reflect.getOwnPropertyDescriptor(currentTranslation, prop);
  },
});

const appConfig = new Proxy({} as ReturnType<typeof getAppConfig>, {
  get: (_, prop) => {
    const currentConfig = getAppConfig();
    return currentConfig[prop as keyof typeof currentConfig];
  },
  ownKeys: () => Reflect.ownKeys(getAppConfig()),
  getOwnPropertyDescriptor: (_, prop) => {
    const currentConfig = getAppConfig();
    return Reflect.getOwnPropertyDescriptor(currentConfig, prop);
  },
});

/**
 * Gets default boundaries file for current country (reactive to URL).
 */
function getDefaultBoundariesFile(): string {
  return getCurrentCountryConfig().defaultBoundariesFile;
}

/**
 * Gets raw tables for current country (reactive to URL).
 */
function getCurrentRawTables(): Record<string, any> {
  return getCurrentCountryConfig().rawTables;
}

/**
 * Gets raw reports for current country (reactive to URL).
 */
function getCurrentRawReports(): Record<string, any> {
  return getCurrentCountryConfig().rawReports;
}

// Create reactive proxies for these values
const rawTables = new Proxy({} as Record<string, any>, {
  get: (_, prop) => {
    const currentTables = getCurrentRawTables();
    return currentTables[prop as keyof typeof currentTables];
  },
  ownKeys: () => Reflect.ownKeys(getCurrentRawTables()),
  getOwnPropertyDescriptor: (_, prop) => {
    const currentTables = getCurrentRawTables();
    return Reflect.getOwnPropertyDescriptor(currentTables, prop);
  },
});

const rawReports = new Proxy({} as Record<string, any>, {
  get: (_, prop) => {
    const currentReports = getCurrentRawReports();
    return currentReports[prop as keyof typeof currentReports];
  },
  ownKeys: () => Reflect.ownKeys(getCurrentRawReports()),
  getOwnPropertyDescriptor: (_, prop) => {
    const currentReports = getCurrentRawReports();
    return Reflect.getOwnPropertyDescriptor(currentReports, prop);
  },
});

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

/**
 * Gets auth required status for current country (reactive to URL).
 */
function getAuthRequiredValue(): boolean {
  return !TESTING && get(getAppConfig(), 'WFPAuthRequired', false);
}

/**
 * Gets enable navigation dropdown status for current country (reactive to URL).
 */
function getEnableNavigationDropdownValue(): boolean {
  return get(getAppConfig(), 'enableNavigationDropdown', false);
}

// Create reactive proxies for boolean values
// These need special handling to work properly as booleans
const authRequired = (() => {
  const proxy = new Proxy({} as { valueOf(): boolean; toString(): string }, {
    get: (_, prop) => {
      const value = getAuthRequiredValue();
      if (prop === 'valueOf' || prop === Symbol.toPrimitive) {
        return () => value;
      }
      if (prop === 'toString') {
        return () => String(value);
      }
      return (Boolean.prototype as any)[prop];
    },
    valueOf: () => getAuthRequiredValue(),
  });
  return proxy;
})() as unknown as boolean;

const enableNavigationDropdown = (() => {
  const proxy = new Proxy({} as { valueOf(): boolean; toString(): string }, {
    get: (_, prop) => {
      const value = getEnableNavigationDropdownValue();
      if (prop === 'valueOf' || prop === Symbol.toPrimitive) {
        return () => value;
      }
      if (prop === 'toString') {
        return () => String(value);
      }
      return (Boolean.prototype as any)[prop];
    },
    valueOf: () => getEnableNavigationDropdownValue(),
  });
  return proxy;
})() as unknown as boolean;

/**
 * Gets default boundaries path for current country (reactive to URL).
 */
function getDefaultBoundariesPath(): string {
  return `${DEFAULT_BOUNDARIES_FOLDER}/${getDefaultBoundariesFile()}`;
}

// Create a reactive proxy for defaultBoundariesPath
const defaultBoundariesPath = new Proxy(
  {} as { toString(): string; valueOf(): string },
  {
    get: (_, prop) => {
      const path = getDefaultBoundariesPath();
      if (prop === 'toString' || prop === Symbol.toPrimitive) {
        return () => path;
      }
      if (prop === 'valueOf') {
        return () => path;
      }
      return (path as any)[prop];
    },
    toString: () => getDefaultBoundariesPath(),
    valueOf: () => getDefaultBoundariesPath(),
  },
) as unknown as string;

export {
  appConfig,
  authRequired,
  countriesWithPreprocessedDates,
  safeCountry,
  defaultBoundariesPath,
  rawLayers,
  rawTables,
  rawReports,
  msalInstance,
  msalRequest,
  enableNavigationDropdown,
  translation,
  getSafeCountry,
};
