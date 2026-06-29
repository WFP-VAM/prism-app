import type { AdminNameDict } from 'context/adminNameTranslationStateSlice';

const bundledTranslationModules = import.meta.glob<AdminNameDict>(
  [
    '../config/universal/translations/*/*.json',
    '../config/universal/translations/*/*/*.json',
  ],
  { import: 'default' },
);

export function loadBundledAdminNameDict(
  scope: string,
  language: string,
): Promise<AdminNameDict> {
  const modulePath = `../config/universal/translations/${scope}/${language}.json`;
  const loader = bundledTranslationModules[modulePath];
  if (!loader) {
    return Promise.resolve({});
  }
  return loader();
}
