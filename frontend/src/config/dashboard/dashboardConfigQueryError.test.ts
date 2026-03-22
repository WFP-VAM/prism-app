import { getDashboardConfigErrorMessage } from './dashboardConfigQueryError';
import { DashboardConfigFetchError } from './fetchDashboardConfig';

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
