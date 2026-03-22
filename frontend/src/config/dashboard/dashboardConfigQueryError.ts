import { DashboardConfigFetchError } from './fetchDashboardConfig';

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
