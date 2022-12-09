import { merge } from 'lodash';
import i18n from 'i18next';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { initReactI18next, useTranslation } from 'react-i18next';
import { registerLocale } from 'react-datepicker';
import { useCallback } from 'react';
import en from 'date-fns/locale/en-US';
import fr from 'date-fns/locale/fr';
import km from 'date-fns/locale/km';
import pt from 'date-fns/locale/pt';
import es from 'date-fns/locale/es';
import { translation } from './config';
import 'moment/locale/km';

const TRANSLATION_DEBUG = false;
// Register other date locales to be used by our DatePicker
// TODO - extract registerLocale and moment/locale imports and loading into a separate file for clarity.
registerLocale('en', en);
registerLocale('fr', fr);
registerLocale('km', km);
registerLocale('pt', pt);
registerLocale('es', es);
export const moment = extendMoment(Moment as any);
moment.locale('en');

export type i18nTranslator = typeof i18n['t'];

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
  .flatMap(language => {
    return Object.keys(translation[language]);
  })
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

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'id',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    fallbackLng: 'en',
    preload: languages,
    ns: ['translation'],
    defaultNS: 'translation',
  });

export function useSafeTranslation(): {
  t: i18nTranslator;
  i18n: typeof i18n;
  ready: boolean;
} {
  const { t, ...rest } = useTranslation();
  return {
    t: useCallback(
      (key: string) => {
        if (key === undefined) {
          return '';
        }
        if (key in resources.en.translation) {
          return t(key);
        }
        if (TRANSLATION_DEBUG) {
          console.warn(
            `Translation for "${key}" is not configured in your translation file.`,
          );
        }
        return key;
      },
      [t],
    ),
    ...rest,
  };
}

export function isEnglishLanguageSelected(lang: typeof i18n): boolean {
  return lang.resolvedLanguage === 'en';
}

export default i18n;
