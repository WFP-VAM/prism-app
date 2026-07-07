import type { AdminNameDict } from 'context/adminNameTranslationStateSlice';

const BUNDLED_PREFIX = 'bundled:';

export function isBundledTranslationsPath(translationsPath: string): boolean {
  return translationsPath.startsWith(BUNDLED_PREFIX);
}

/** Landing map: admin0 country names only. Country map: that country's names. */
export function resolveAdminNameTranslationScope(
  iso3: string | undefined,
): string {
  return iso3 ? iso3.toUpperCase() : 'global/admin0';
}

export function resolveTranslationsPath(
  translationsPath: string,
  language: string,
  scope: string,
): string {
  return translationsPath
    .replace('{scope}', scope)
    .replace('{iso3}', scope)
    .replace('{lang}', language);
}

export async function loadAdminNameDict(
  translationsPath: string,
  language: string,
  scope: string,
): Promise<AdminNameDict> {
  if (isBundledTranslationsPath(translationsPath)) {
    const { loadBundledAdminNameDict } =
      await import('./admin-name-translations-bundled');
    return loadBundledAdminNameDict(scope, language);
  }

  const url = resolveTranslationsPath(translationsPath, language, scope);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load admin name translations (${response.status}) from ${url}`,
    );
  }
  const data = (await response.json()) as AdminNameDict;
  return data ?? {};
}
