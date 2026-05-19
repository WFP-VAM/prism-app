import { appConfig } from 'config';
import i18n, { languages } from 'i18n';
import { get } from 'lodash';

/** URL query param for export / batch map language (see ExportView). */
export const EXPORT_LANGUAGE_PARAM = 'language';

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
  let lang: string;
  if (fromUrl && languages.includes(fromUrl)) {
    lang = fromUrl;
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
