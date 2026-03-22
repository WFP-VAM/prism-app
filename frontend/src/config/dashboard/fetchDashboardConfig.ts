import type { Dashboard } from 'config/types';
import {
  validateDashboardConfig,
  formatDashboardValidationError,
} from './schema';

export class DashboardConfigFetchError extends Error {
  constructor(
    message: string,
    public readonly causeType: 'http' | 'network' | 'json' | 'validation',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DashboardConfigFetchError';
  }
}

/**
 * Fetches dashboard.json, parses JSON, and validates against the dashboard schema.
 */
export async function fetchDashboardConfig(url: string): Promise<Dashboard[]> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Network error loading dashboard config';
    throw new DashboardConfigFetchError(
      `Could not load dashboard configuration: ${message}`,
      'network',
    );
  }

  if (!response.ok) {
    throw new DashboardConfigFetchError(
      `Dashboard configuration request failed (${response.status} ${response.statusText})`,
      'http',
      response.status,
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new DashboardConfigFetchError(
      'Dashboard configuration is not valid JSON',
      'json',
    );
  }

  const validated = validateDashboardConfig(parsed);
  if (!validated.success) {
    throw new DashboardConfigFetchError(
      formatDashboardValidationError(validated.error),
      'validation',
    );
  }

  return validated.data;
}
