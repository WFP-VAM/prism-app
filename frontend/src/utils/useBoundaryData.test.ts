import {
  PMTILES_MAX_SOURCE_RETRIES,
  shouldRetryPmtilesLoad,
} from './useBoundaryData';

describe('shouldRetryPmtilesLoad', () => {
  it('retries when there are no features and retries remain', () => {
    expect(shouldRetryPmtilesLoad(0, 0)).toBe(true);
    expect(shouldRetryPmtilesLoad(PMTILES_MAX_SOURCE_RETRIES - 1, 0)).toBe(
      true,
    );
  });

  it('stops retrying after max attempts', () => {
    expect(shouldRetryPmtilesLoad(PMTILES_MAX_SOURCE_RETRIES, 0)).toBe(false);
  });

  it('does not retry when features are loaded', () => {
    expect(shouldRetryPmtilesLoad(0, 3)).toBe(false);
  });
});
