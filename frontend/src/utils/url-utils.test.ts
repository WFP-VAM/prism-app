import { AA_DROUGHT_API_URL } from './constants';
import {
  getAACsvPreviewParam,
  getAADroughtCdnUrl,
  getAADroughtUrl,
  getStagingParam,
} from './url-utils';

const PROD_URL = 'https://cdn.example.com/zimbabwe/aa_drought.csv';
const STAGING_URL = 'https://staging.example.com/zimbabwe/aa_drought.csv';

const appConfig = {
  anticipatoryActionDroughtUrl: PROD_URL,
  anticipatoryActionDroughtStagingUrl: STAGING_URL,
};

function setSearch(search: string) {
  window.history.pushState({}, '', search ? `/?${search}` : '/');
}

afterEach(() => setSearch(''));

describe('getStagingParam / getAACsvPreviewParam', () => {
  test('read their own params independently', () => {
    setSearch('staging=true');
    expect(getStagingParam()).toBe(true);
    expect(getAACsvPreviewParam()).toBe(false);

    setSearch('aa-csv-preview=true');
    expect(getStagingParam()).toBe(false);
    expect(getAACsvPreviewParam()).toBe(true);

    setSearch('');
    expect(getStagingParam()).toBe(false);
    expect(getAACsvPreviewParam()).toBe(false);
  });
});

describe('getAADroughtCdnUrl', () => {
  test('returns the prod URL by default', () => {
    setSearch('');
    expect(getAADroughtCdnUrl(appConfig)).toBe(PROD_URL);
  });

  test('returns the S3 staging URL only for aa-csv-preview=true', () => {
    setSearch('aa-csv-preview=true');
    expect(getAADroughtCdnUrl(appConfig)).toBe(STAGING_URL);
  });

  test('staging=true does not select the S3 staging URL', () => {
    setSearch('staging=true');
    expect(getAADroughtCdnUrl(appConfig)).toBe(PROD_URL);
  });

  test('falls back to prod URL when no staging URL is configured', () => {
    setSearch('aa-csv-preview=true');
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

  test('staging=true: routes through the API with include_staging=true', () => {
    setSearch('staging=true');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${AA_DROUGHT_API_URL}/zimbabwe.csv`,
    );
    expect(url.searchParams.get('include_staging')).toBe('true');
    expect(url.searchParams.get('fallback')).toBe(PROD_URL);
  });

  test('aa-csv-preview=true: fetches the S3 staging URL directly (bypasses API)', () => {
    setSearch('aa-csv-preview=true');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(STAGING_URL);
    expect(url.searchParams.get('date')).toBeTruthy();
  });

  test('both params: S3 preview wins over the DB staging path', () => {
    setSearch('aa-csv-preview=true&staging=true');
    const url = new URL(getAADroughtUrl(appConfig, 'zimbabwe') as string);
    expect(`${url.origin}${url.pathname}`).toBe(STAGING_URL);
    expect(url.searchParams.get('include_staging')).toBeNull();
  });

  test('aa-csv-preview=true without a staging URL falls back to the API path', () => {
    setSearch('aa-csv-preview=true');
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
