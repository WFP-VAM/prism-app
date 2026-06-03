import type { Dashboard } from 'config/types';

import {
  formatDashboardValidationError,
  validateDashboardConfig,
} from './schema';

import { fetchJsonOrNull, FetchJsonError } from 'utils/fetchJsonOrNull';

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

function parseValidatedDashboardBody(parsed: unknown): Dashboard[] {
  const validated = validateDashboardConfig(parsed);
  if (!validated.success) {
    throw new DashboardConfigFetchError(
      formatDashboardValidationError(validated.error),
      'validation',
    );
  }
  return validated.data;
}

/**
 * Fetches a published-dashboard JSON array (full URL, e.g. GET `/dashboards?…`),
 * parses the body, and validates it against the dashboard schema.
 */
export async function fetchDashboardConfig(url: string): Promise<Dashboard[]> {
  let parsed: unknown;
  try {
    parsed = await fetchJsonOrNull(url);
  } catch (e) {
    if (e instanceof FetchJsonError) {
      throw new DashboardConfigFetchError(e.message, e.causeType, e.status);
    }
    throw new DashboardConfigFetchError(
      `Could not load dashboard configuration: ${e instanceof Error ? e.message : 'Unknown error'}`,
      'network',
    );
  }

  if (parsed === null) {
    throw new DashboardConfigFetchError(
      'Dashboard configuration not found',
      'http',
      404,
    );
  }

  return parseValidatedDashboardBody(parsed);
}
