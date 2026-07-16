import { configureStore } from '@reduxjs/toolkit';
import adminNameTranslationStateReduce, {
  loadAdminNameTranslations,
} from 'context/adminNameTranslationStateSlice';

describe('adminNameTranslationStateSlice', () => {
  const createStore = () =>
    configureStore({
      reducer: {
        adminNameTranslationState: adminNameTranslationStateReduce,
      },
    });

  type TestStore = ReturnType<typeof createStore>;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loadAdminNameTranslations fetches and caches a language dict', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ Mozambique: 'Moçambique' }),
    } as Response);

    const store = createStore();

    await store.dispatch(
      loadAdminNameTranslations({
        language: 'fr',
        translationsPath: 'https://example.com/{scope}/{lang}.json',
        scope: 'global/admin0',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/global/admin0/fr.json',
    );
    expect(
      (store as TestStore).getState().adminNameTranslationState.byLanguage.fr
        .dict,
    ).toEqual({
      Mozambique: 'Moçambique',
    });
  });

  it('skips duplicate fetches while a language dict is ready', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ A: 'B' }),
    } as Response);

    const store = createStore();
    const args = {
      language: 'es',
      translationsPath: 'https://example.com/{scope}/{lang}.json',
      scope: 'MOZ',
    };

    await store.dispatch(loadAdminNameTranslations(args));
    await store.dispatch(loadAdminNameTranslations(args));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch English sidecars', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    const store = createStore();
    const result = await store.dispatch(
      loadAdminNameTranslations({
        language: 'en',
        translationsPath: 'https://example.com/{scope}/{lang}.json',
        scope: 'global/admin0',
      }),
    );

    if (loadAdminNameTranslations.rejected.match(result)) {
      expect(result.meta.condition).toBe(true);
    } else {
      throw new Error('Expected English load to be skipped by condition');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
