import { merge } from 'lodash';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { registerLocale } from 'react-datepicker';
import { fr, km, pt, es, ru, mn, enUS } from 'date-fns/locale';

import { extractTranslationItems } from 'config/config.test.utils';
import { appConfig, getRawLayers, safeCountry, translation } from './config';

const TRANSLATION_DEBUG = false;
const layers = getRawLayers(safeCountry, true);
// Register other date locales to be used by our DatePicker
// TODO - extract registerLocale  imports and loading into a separate file for clarity.
// Test for missing locales
registerLocale('en', enUS);
registerLocale('fr', fr);
registerLocale('km', km);
registerLocale('pt', pt);
registerLocale('es', es);
registerLocale('ru', ru);
registerLocale('mn', mn);

export type i18nTranslator = (typeof i18n)['t'];

export const appResources = {
  en: {
    translation: {
      date_locale: 'en',
      Today: 'Today',
      about: 'about',
      'Tap the map to select': 'Tap the map to select',
      'Click the map to select': 'Click the map to select',
      Prism: 'Prism',
    },
  },
};

// Translations are expected to take the form {"fr": {"english sentence": "french translation", ...}
export const formattedTranslation = Object.keys(translation).reduce(
  (a, v) => ({ ...a, [v]: { translation: translation[v] } }),
  {},
);

const englishKeys = Object.keys(translation)
  .flatMap(language => Object.keys(translation[language]))
  .reduce(
    (previousKeys, currentKey) => ({
      ...previousKeys,
      [currentKey]: currentKey,
    }),
    {},
  );

export const resources = merge(
  {
    en: { translation: englishKeys },
  },
  appResources,
  formattedTranslation,
);

export const languages = Object.keys(resources);

const isDevelopment = ['development'].includes(process.env.NODE_ENV || '');

const missingKeys: Record<string, string[]> = { en: [] };
if (TRANSLATION_DEBUG || isDevelopment) {
  const itemsToTranslate: string[] = extractTranslationItems(appConfig, layers);
  itemsToTranslate.forEach(item => {
    if (
      item !== '' &&
      !Object.prototype.hasOwnProperty.call(resources.en.translation, item)
    ) {
      missingKeys.en.push(item);
    }
  });

  // eslint-disable-next-line no-console
  console.log('Missing translation keys:', missingKeys.en);
}

function logMissingKey(lng: string, key: string) {
  if (TRANSLATION_DEBUG || isDevelopment) {
    if (!missingKeys[lng]) {
      missingKeys[lng] = [];
    }

    if (!missingKeys[lng].includes(key) && key !== '') {
      missingKeys[lng].push(key);
      // eslint-disable-next-line no-console
      console.log('Missing keys:', missingKeys[lng]);
    }
  }
}

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    fallbackLng: 'en',
    preload: languages,
    ns: ['translation'],
    defaultNS: 'translation',
    saveMissing: true,
    missingKeyHandler: (lng, _ns, key) => {
      const foundLng = Array.isArray(lng) ? lng[0] : lng;
      logMissingKey(foundLng, key);
    },
  });

export function useSafeTranslation(): {
  t: i18nTranslator;
  i18n: typeof i18n;
  ready: boolean;
} {
  const { t, ...rest } = useTranslation();
  return {
    t,
    ...rest,
  };
}

export function isEnglishLanguageSelected(lang: typeof i18n): boolean {
  return lang.resolvedLanguage === 'en';
}

export const locales = {
  en: enUS,
  fr,
  km,
  pt,
  es,
  ru,
  mn,
};

export default i18n;
