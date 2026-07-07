import {
  isBundledTranslationsPath,
  resolveAdminNameTranslationScope,
  resolveTranslationsPath,
} from './admin-name-translations-loader';

describe('admin-name-translations-loader', () => {
  it('resolveAdminNameTranslationScope uses admin0 on landing and iso3 in country view', () => {
    expect(resolveAdminNameTranslationScope(undefined)).toBe('global/admin0');
    expect(resolveAdminNameTranslationScope('moz')).toBe('MOZ');
  });

  it('resolveTranslationsPath substitutes scope and lang placeholders', () => {
    expect(
      resolveTranslationsPath(
        'bundled:universal/translations/{scope}/{lang}.json',
        'fr',
        'global/admin0',
      ),
    ).toBe('bundled:universal/translations/global/admin0/fr.json');
    expect(
      resolveTranslationsPath(
        'https://example.com/{iso3}/{lang}.json',
        'fr',
        'MOZ',
      ),
    ).toBe('https://example.com/MOZ/fr.json');
  });

  it('isBundledTranslationsPath detects bundled config prefix', () => {
    expect(
      isBundledTranslationsPath(
        'bundled:universal/translations/{scope}/{lang}.json',
      ),
    ).toBe(true);
    expect(isBundledTranslationsPath('https://example.com/{lang}.json')).toBe(
      false,
    );
  });
});
