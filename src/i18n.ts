import { merge } from 'lodash';
import i18n from 'i18next';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { initReactI18next } from 'react-i18next';
import { registerLocale } from 'react-datepicker';
import fr from 'date-fns/locale/fr';
import km from 'date-fns/locale/km';
import en from 'date-fns/locale/en-US';
import { translation } from './config';
import 'moment/locale/km';

export type i18nTranslator = typeof i18n['t'];

export const appResources = {
  en: {
    translation: {
      // Date settings
      date_locale: 'en',
      Today: 'Today',
      about: 'about',
      'Tap the map to select': 'Tap the map to select',
      'Click the map to select': 'Click the map to select',
      Prism: 'Prism',
      // Main buttons
      Export: 'Export',
      Legend: 'Legend',
      // Menu
      Hazards: 'Hazards',
      Vulnerability: 'Vulnerability',
      Exposure: 'Exposure',
      Risk: 'Risk',
      // Analysis
      'Run Analysis': 'Run Analysis',
      'Hazard Layer': 'Hazard Layer',
      'Baseline Layer': 'Baseline Layer',
      'Choose hazard layer': 'Choose hazard layer',
      'Choose baseline layer': 'Choose baseline layer',
      Statistic: 'Statistic',
      Threshold: 'Threshold',
      Above: 'Above',
      Below: 'Below',
      Mean: 'Mean',
      Median: 'Median',
      Date: 'Date',
    },
  },
  // fr: {
  //   translation: {
  //     // Date settings
  //     date_locale: 'fr',
  //     Today: "Aujourd'hui",
  //     about: 'Apropos',
  //     'Click the map to select': 'Cliquez sur la carte pour séléctionner',
  //     // Main buttons
  //     Export: 'Exporter',
  //     Legend: 'Légende',
  //     // Menu
  //     Hazards: 'Dangers',
  //     Vulnerability: 'Vulnerabilités',
  //     Exposure: 'Exposition',
  //     Risk: 'Risques',
  //     // Analysis
  //     'Run Analysis': 'Lancer une analyse',
  //     'Hazard Layer': 'Dangers',
  //     'Baseline Layer': 'Données de référence',
  //     'Choose hazard layer': 'Choisissez un danger',
  //     'Choose baseline layer': 'Choisissez des données de référence',
  //     Statistic: 'Statistique',
  //     Threshold: 'Limite',
  //     Above: 'Au dessus de',
  //     Below: 'En dessous de',
  //     Mean: 'Moyenne',
  //     Median: 'Medianne',
  //   },
  // },
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
  .reduce((a, v) => ({ ...a, [v]: v }), {});

export const resources = merge(
  {
    en: { translation: englishKeys },
  },
  appResources,
  formattedTranslation,
);

export const languages = Object.keys(resources);

// Register other date locales to be used by our DatePicker
registerLocale('en', en);
registerLocale('fr', fr);
registerLocale('km', km);
const moment = extendMoment(Moment as any);
moment.locale('en');
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
  });

export const safeTranslate = (
  translator: i18nTranslator,
  key: string | undefined,
): string => {
  if (key === undefined) {
    return '';
  }
  if (key in resources.en.translation) {
    return translator(key);
  }
  // eslint-disable-next-line no-console
  console.info(
    `Translation for "${key}" is not configured in your translation file.`,
  );
  return key;
};

export function isLocalLanguageChosen(lang: typeof i18n): boolean {
  return !(lang.resolvedLanguage === 'en');
}

export default i18n;
