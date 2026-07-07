import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { CreateAsyncThunkTypes, RootState } from './store';

export const ADMIN_NAME_SIDECAR_LANGUAGES = [
  'fr',
  'es',
  'ar',
  'ru',
  'zh',
] as const;

export type AdminNameSidecarLanguage =
  (typeof ADMIN_NAME_SIDECAR_LANGUAGES)[number];

export type AdminNameDict = Record<string, string>;

export type AdminNameTranslationEntry = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  dict: AdminNameDict;
  error?: string;
};

type AdminNameTranslationState = {
  translationsPath?: string;
  scope?: string;
  byLanguage: Record<string, AdminNameTranslationEntry>;
};

const initialState: AdminNameTranslationState = {
  byLanguage: {},
};

export function hasAdminNameSidecar(
  language: string,
): language is AdminNameSidecarLanguage {
  return (ADMIN_NAME_SIDECAR_LANGUAGES as readonly string[]).includes(language);
}

const inFlightRequests = new Map<string, Promise<AdminNameDict>>();

function cacheKey(scope: string, language: string): string {
  return `${scope}:${language}`;
}

async function fetchAdminNameDict(
  translationsPath: string,
  language: string,
  scope: string,
): Promise<AdminNameDict> {
  const { loadAdminNameDict } =
    await import('utils/admin-name-translations-loader');
  return loadAdminNameDict(translationsPath, language, scope);
}

export const loadAdminNameTranslations = createAsyncThunk<
  { language: string; scope: string; dict: AdminNameDict },
  { language: string; translationsPath: string; scope: string },
  CreateAsyncThunkTypes
>(
  'adminNameTranslation/load',
  async ({ language, translationsPath, scope }) => {
    const requestKey = `${translationsPath}:${cacheKey(scope, language)}`;

    let request = inFlightRequests.get(requestKey);
    if (!request) {
      request = fetchAdminNameDict(translationsPath, language, scope);
      inFlightRequests.set(requestKey, request);
      request.finally(() => {
        inFlightRequests.delete(requestKey);
      });
    }

    const dict = await request;
    return { language, scope, dict };
  },
  {
    condition: ({ language, translationsPath }, { getState }) => {
      if (
        !translationsPath ||
        language === 'en' ||
        !hasAdminNameSidecar(language)
      ) {
        return false;
      }

      const entry = getState().adminNameTranslationState.byLanguage[language];
      return entry?.status !== 'loading' && entry?.status !== 'ready';
    },
  },
);

export const adminNameTranslationStateSlice = createSlice({
  name: 'adminNameTranslationState',
  initialState,
  reducers: {
    setAdminNameTranslationsPath: (
      state,
      { payload }: PayloadAction<string | undefined>,
    ) => {
      if (state.translationsPath === payload) {
        return;
      }
      state.translationsPath = payload;
      state.byLanguage = {};
    },
    setAdminNameTranslationScope: (
      state,
      { payload }: PayloadAction<string | undefined>,
    ) => {
      if (state.scope === payload) {
        return;
      }
      state.scope = payload;
      state.byLanguage = {};
    },
    clearAdminNameTranslations: state => {
      state.byLanguage = {};
    },
  },
  extraReducers: builder => {
    builder.addCase(loadAdminNameTranslations.pending, (state, action) => {
      const { language } = action.meta.arg;
      state.byLanguage[language] = {
        status: 'loading',
        dict: state.byLanguage[language]?.dict ?? {},
      };
    });
    builder.addCase(loadAdminNameTranslations.fulfilled, (state, action) => {
      const { language, dict } = action.payload;
      state.byLanguage[language] = {
        status: 'ready',
        dict,
      };
    });
    builder.addCase(loadAdminNameTranslations.rejected, (state, action) => {
      const { language } = action.meta.arg;
      state.byLanguage[language] = {
        status: 'error',
        dict: state.byLanguage[language]?.dict ?? {},
        error: action.error.message,
      };
    });
  },
});

export const {
  setAdminNameTranslationsPath,
  setAdminNameTranslationScope,
  clearAdminNameTranslations,
} = adminNameTranslationStateSlice.actions;

export const selectAdminNameTranslationEntry = (
  state: RootState,
  language: string,
): AdminNameTranslationEntry | undefined =>
  state.adminNameTranslationState.byLanguage[language];

export const selectAdminNameDict = (
  state: RootState,
  language: string,
): AdminNameDict | undefined => {
  const entry = selectAdminNameTranslationEntry(state, language);
  return entry?.status === 'ready' ? entry.dict : undefined;
};

export default adminNameTranslationStateSlice.reducer;
