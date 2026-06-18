import { getBoundaryLayerSingleton } from 'config/utils';
import {
  loadAdminNameTranslations,
  selectAdminNameDict,
  selectAdminNameTranslationEntry,
  setAdminNameTranslationScope,
  setAdminNameTranslationsPath,
} from 'context/adminNameTranslationStateSlice';
import type { RootState } from 'context/store';
import { useCountryIso } from 'context/useCountryIso';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { resolveAdminNameTranslationScope } from 'utils/admin-name-translations-loader';
import {
  getActiveAdminNameLanguage,
  getAdminDisplayLocationName,
  getAdminNameDictForLanguage,
} from 'utils/admin-name-utils';

export function useAdminNameTranslations(): {
  language: string;
  scope: string;
  dict: ReturnType<typeof getAdminNameDictForLanguage>;
  status: 'idle' | 'loading' | 'ready' | 'error' | undefined;
} {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const language = getActiveAdminNameLanguage(i18n);
  const countryIso = useCountryIso(true);
  const scope = resolveAdminNameTranslationScope(countryIso?.iso3);
  const boundaryLayer = getBoundaryLayerSingleton();
  const translationsPath = boundaryLayer.translationsPath;
  const entry = useSelector((state: RootState) =>
    selectAdminNameTranslationEntry(state, language),
  );
  const dict = useSelector((state: RootState) =>
    selectAdminNameDict(state, language),
  );

  useEffect(() => {
    dispatch(setAdminNameTranslationsPath(translationsPath));
  }, [dispatch, translationsPath]);

  useEffect(() => {
    dispatch(setAdminNameTranslationScope(scope));
  }, [dispatch, scope]);

  useEffect(() => {
    if (!translationsPath) {
      return;
    }
    dispatch(loadAdminNameTranslations({ language, translationsPath, scope }));
  }, [dispatch, language, translationsPath, scope]);

  return {
    language,
    scope,
    dict: getAdminNameDictForLanguage(language, dict),
    status: entry?.status,
  };
}

export function useLocalizedAdminDisplayName(
  englishLevelNames: string[],
  feature?: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>,
): string {
  const { language, dict } = useAdminNameTranslations();
  const boundaryLayer = getBoundaryLayerSingleton();

  return getAdminDisplayLocationName(
    boundaryLayer,
    englishLevelNames,
    feature,
    language,
    dict,
  );
}

export function useLocalizedAdminName(englishName: string): string {
  const { language, dict } = useAdminNameTranslations();
  if (language === 'en' || !dict) {
    return englishName;
  }
  return dict[englishName] ?? englishName;
}
