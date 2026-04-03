import {
  getDashboardConfigErrorMessage,
  isDashboardConfigNotFoundError,
} from './dashboardConfigQueryError';
import { DashboardConfigFetchError } from './fetchDashboardConfig';

describe('isDashboardConfigNotFoundError', () => {
  it('is true for HTTP 404 fetch error', () => {
    expect(
      isDashboardConfigNotFoundError(
        new DashboardConfigFetchError('Not Found', 'http', 404),
      ),
    ).toBe(true);
  });

  it('is false for other HTTP statuses and non-http errors', () => {
    expect(
      isDashboardConfigNotFoundError(
        new DashboardConfigFetchError('fail', 'http', 500),
      ),
    ).toBe(false);
    expect(
      isDashboardConfigNotFoundError(
        new DashboardConfigFetchError('bad json', 'json'),
      ),
    ).toBe(false);
    expect(isDashboardConfigNotFoundError(new Error('x'))).toBe(false);
  });
});

describe('getDashboardConfigErrorMessage', () => {
  it('uses DashboardConfigFetchError message', () => {
    const err = new DashboardConfigFetchError('custom', 'http', 500);
    expect(getDashboardConfigErrorMessage(err)).toBe('custom');
  });

  it('wraps generic Error', () => {
    expect(getDashboardConfigErrorMessage(new Error('oops'))).toContain('oops');
  });

  it('falls back for unknown', () => {
    expect(getDashboardConfigErrorMessage(null)).toBe(
      'Could not load dashboard configuration.',
    );
  });
});
