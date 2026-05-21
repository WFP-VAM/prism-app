import i18n, { languages } from 'i18n';

import {
  exportLanguage,
  toExportLanguageParam,
} from './exportLanguage';

const hasArabic = languages.includes('عربى');
const itWithArabic = hasArabic ? it : it.skip;

describe('exportLanguage', () => {
  it('accepts standard 2-letter codes', () => {
    expect(exportLanguage('?language=pt')).toBe('pt');
  });

  itWithArabic('maps 2-letter URL param ar to Arabic i18n key', () => {
    expect(exportLanguage('?language=ar')).toBe('عربى');
  });

  itWithArabic('still accepts legacy Arabic i18n key in URL', () => {
    expect(exportLanguage('?language=عربى')).toBe('عربى');
  });

  itWithArabic('applies resolved language to i18n when apply is true', async () => {
    await i18n.changeLanguage('en');
    exportLanguage('?language=ar', { apply: true });
    expect(i18n.resolvedLanguage).toBe('عربى');
    await i18n.changeLanguage('en');
  });
});

describe('toExportLanguageParam', () => {
  it('maps Arabic i18n key to ar', () => {
    expect(toExportLanguageParam('عربى')).toBe('ar');
  });

  it('passes through standard 2-letter codes', () => {
    expect(toExportLanguageParam('pt')).toBe('pt');
  });
});
