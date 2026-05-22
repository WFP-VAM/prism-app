import i18n from 'i18n';
import { useEffect } from 'react';
import { isRtlLanguage } from 'utils/localeDirection';

/** Sync `<html lang>` and RTL text class from active i18n language. */
export function useDocumentLocale(): void {
  useEffect(() => {
    const apply = (lang: string) => {
      document.documentElement.lang = lang;
      document.body.classList.toggle('locale-rtl-text', isRtlLanguage(lang));
    };

    apply(i18n.resolvedLanguage ?? 'en');
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, []);
}
