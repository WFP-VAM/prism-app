import { AA_DROUGHT_API_URL } from './constants';
import {
  getAADroughtCdnUrl,
  getAADroughtPreviewParam,
  getAADroughtStagingParam,
  getAADroughtUrl,
} from './url-utils';

const PROD_URL = 'https://cdn.example.com/zimbabwe/aa_drought.csv';
const PREVIEW_URL = 'https://preview.example.com/zimbabwe/aa_drought.csv';

const appConfig = {
  anticipatoryActionDroughtUrl: PROD_URL,
  anticipatoryActionDroughtPreviewUrl: PREVIEW_URL,
};

function setSearch(search: string) {
  window.history.pushState({}, '', search ? `/?${search}` : '/');
}

afterEach(() => setSearch(''));

describe('getAADroughtStagingParam / getAADroughtPreviewParam', () => {
  test('read their own params independently', () => {
    setSearch('aa-drought-staging=true');
    expect(getAADroughtStagingParam()).toBe(true);
    expect(getAADroughtPreviewParam()).toBe(false);

    setSearch('aa-drought-preview=true');
    expect(getAADroughtStagingParam()).toBe(false);
    expect(getAADroughtPreviewParam()).toBe(true);

    setSearch('');
    expect(getAADroughtStagingParam()).toBe(false);
    expect(getAADroughtPreviewParam()).toBe(false);
  });
});

describe('getAADroughtCdnUrl', () => {
  test('returns the prod URL by default', () => {
    setSearch('');
    expect(getAADroughtCdnUrl(appConfig)).toBe(PROD_URL);
  });

  test('returns the S3 preview URL only for aa-drought-preview=true', () => {
    setSearch('aa-drought-preview=true');
    expect(getAADroughtCdnUrl(appConfig)).toBe(PREVIEW_URL);
  });

  test('aa-drought-staging=true does not select the S3 preview URL', () => {
    setSearch('aa-drought-staging=true');
    expect(getAADroughtCdnUrl(appConfig)).toBe(PROD_URL);
  });

  test('falls back to prod URL when no preview URL is configured', () => {
    setSearch('aa-drought-preview=true');
    expect(getAADroughtCdnUrl({ anticipatoryActionDroughtUrl: PROD_URL })).toBe(
      PROD_URL,
    );
  });
});

describe('getAADroughtUrl', () => {
  test('no param: routes through the API with prod fallback, no include_staging', () => {
    setSearch('');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${AA_DROUGHT_API_URL}/zimbabwe.csv`,
    );
    expect(url.searchParams.get('fallback')).toBe(PROD_URL);
    expect(url.searchParams.get('include_staging')).toBeNull();
    expect(url.searchParams.get('date')).toBeTruthy();
  });

  test('aa-drought-staging=true: routes through the API with include_staging=true', () => {
    setSearch('aa-drought-staging=true');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${AA_DROUGHT_API_URL}/zimbabwe.csv`,
    );
    expect(url.searchParams.get('include_staging')).toBe('true');
    expect(url.searchParams.get('fallback')).toBe(PROD_URL);
  });

  test('aa-drought-preview=true: fetches the S3 preview URL directly (bypasses API)', () => {
    setSearch('aa-drought-preview=true');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(PREVIEW_URL);
    expect(url.searchParams.get('date')).toBeTruthy();
  });

  test('both params: S3 preview wins over the DB staging path', () => {
    setSearch('aa-drought-preview=true&aa-drought-staging=true');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(PREVIEW_URL);
    expect(url.searchParams.get('include_staging')).toBeNull();
  });

  test('aa-drought-preview=true without a preview URL falls back to the API path', () => {
    setSearch('aa-drought-preview=true');
    const url = new URL(
      getAADroughtUrl(
        { anticipatoryActionDroughtUrl: PROD_URL },
        'zimbabwe',
      ) as string,
    );
    expect(`${url.origin}${url.pathname}`).toBe(
      `${AA_DROUGHT_API_URL}/zimbabwe.csv`,
    );
    expect(url.searchParams.get('fallback')).toBe(PROD_URL);
  });
});
