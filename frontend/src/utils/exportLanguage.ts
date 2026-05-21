import { appConfig } from 'config';
import i18n, { languages } from 'i18n';
import { get } from 'lodash';

/** URL query param for export / batch map language (see ExportView). */
export const EXPORT_LANGUAGE_PARAM = 'language';

/** i18n language keys that differ from the 2-letter export URL param. */
const I18N_TO_EXPORT_LANGUAGE_PARAM: Partial<Record<string, string>> = {
  عربى: 'ar',
};

const EXPORT_LANGUAGE_PARAM_TO_I18N: Record<string, string> = Object.fromEntries(
  Object.entries(I18N_TO_EXPORT_LANGUAGE_PARAM).map(([i18n, param]) => [
    param,
    i18n,
  ]),
);

/** Map i18n language key to 2-letter `?language=` value for export URLs. */
export function toExportLanguageParam(i18nLanguage: string): string {
  return I18N_TO_EXPORT_LANGUAGE_PARAM[i18nLanguage] ?? i18nLanguage;
}

function resolveI18nFromExportParam(param: string): string | null {
  const aliased = EXPORT_LANGUAGE_PARAM_TO_I18N[param];
  if (aliased && languages.includes(aliased)) {
    return aliased;
  }
  if (languages.includes(param)) {
    return param;
  }
  return null;
}

type ExportLanguageOptions = {
  /** Navbar / i18n language when building batch URLs and the page URL has no param. */
  activeLanguage?: string | null;
  /** Switch i18n to the resolved language (ExportView). */
  apply?: boolean;
};

/**
 * Resolve export language: `?language=` on the page URL, else active UI language
 * (batch only), else app default. Optionally applies to i18n.
 */
export function exportLanguage(
  search: string,
  options?: ExportLanguageOptions,
): string {
  const defaultLocale = get(appConfig, 'defaultLanguage', 'en');
  const fallback = languages.includes(defaultLocale) ? defaultLocale : 'en';

  const fromUrl = new URLSearchParams(search).get(EXPORT_LANGUAGE_PARAM);
  const resolvedFromUrl = fromUrl ? resolveI18nFromExportParam(fromUrl) : null;
  let lang: string;
  if (resolvedFromUrl) {
    lang = resolvedFromUrl;
  } else if (
    options?.activeLanguage &&
    languages.includes(options.activeLanguage)
  ) {
    lang = options.activeLanguage;
  } else {
    lang = fallback;
  }

  if (options?.apply && i18n.resolvedLanguage !== lang) {
    void i18n.changeLanguage(lang);
  }

  return lang;
}
