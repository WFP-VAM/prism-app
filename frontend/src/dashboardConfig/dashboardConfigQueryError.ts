import { DashboardConfigFetchError } from './fetchDashboardConfig';

/** True when dashboard.json is missing (HTTP 404): normal state, not a load failure. */
export function isDashboardConfigNotFoundError(error: unknown): boolean {
  return (
    error instanceof DashboardConfigFetchError &&
    error.causeType === 'http' &&
    error.status === 404
  );
}

/**
 * Maps fetch/validation errors to user-facing notification messages (shared with tests).
 */
export function getDashboardConfigErrorMessage(error: unknown): string {
  if (error instanceof DashboardConfigFetchError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `Could not load dashboard configuration: ${error.message}`;
  }
  return 'Could not load dashboard configuration.';
}
