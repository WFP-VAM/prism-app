import { merge, find } from 'lodash';

const LANGUAGE_STORAGE_KEY = 'language';

export type LanguageConfig = {
  default: string;
  languages: LanguageOption[];
};

export type LanguageOption = {
  id: string;
  label: string;
  layers: { [key: string]: any };
  categories: { [key: string]: string };
  uiLabels: { [key: string]: string };
};

interface AppConfig {
  icons: { [key: string]: string };
  categories: { [key: string]: { [key: string]: string[] } };
}

export function getSelectedLanguageId(languageConfig: LanguageConfig): string {
  const langIds = languageConfig.languages.map(l => l.id);
  const selectedId = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || '';
  return langIds.includes(selectedId) ? selectedId : languageConfig.default;
}

export function setLanguageId(id: string, languageConfig: LanguageConfig) {
  const langIds = languageConfig.languages.map(l => l.id);
  if (langIds.includes(id)) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, id);
  } else {
    throw new Error(`Invalid language id: ${id}`);
  }
}

export function getSelectedLanguage(
  languageConfig: LanguageConfig,
): LanguageOption {
  const selectedId = getSelectedLanguageId(languageConfig);
  return find(languageConfig.languages, { id: selectedId })!;
}

export function translateRawLayers<T>(
  rawLayers: T,
  language: LanguageOption,
): T {
  const langLayers = language.layers as T;
  return merge(rawLayers, langLayers);
}

export function translateAppConfig<T extends AppConfig>(
  appConfig: T,
  language: LanguageOption,
): T {
  const trans = (v: string) =>
    v in language.categories ? language.categories[v] : v;
  const translatedCategories = Object.fromEntries(
    Object.keys(appConfig.categories).map(categoryKey => {
      const category = appConfig.categories[categoryKey];
      const translatedCategory = Object.fromEntries(
        Object.keys(category).map(subcategoryKey => {
          return [trans(subcategoryKey), category[subcategoryKey]];
        }),
      );
      return [trans(categoryKey), translatedCategory];
    }),
  );
  const { icons } = appConfig;
  const translatedIcons = Object.fromEntries(
    Object.keys(icons).map(iconKey => {
      return [trans(iconKey), icons[iconKey]];
    }),
  );
  return {
    ...appConfig,
    icons: translatedIcons,
    categories: translatedCategories,
  };
}
