import type { Dashboard } from 'config/types';
import { fetchJsonOrNull, JsonFetchError } from 'utils/fetchJsonOrNull';

import {
  formatDashboardValidationError,
  validateDashboardConfig,
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
    if (e instanceof JsonFetchError) {
      if (e.causeType === 'json') {
        throw new DashboardConfigFetchError(
          'Dashboard configuration is not valid JSON',
          'json',
        );
      }
      throw new DashboardConfigFetchError(
        e.causeType === 'network'
          ? `Could not load dashboard configuration: ${e.message}`
          : `Dashboard configuration request failed (${e.status})`,
        e.causeType,
        e.status,
      );
    }
    throw e;
  }

  // Missing file: a real 404, or the SPA-fallback HTML served with status 200
  // (see fetchJsonOrNull). Surface both as a 404 so the UI stays silent.
  if (parsed === null) {
    throw new DashboardConfigFetchError(
      'Dashboard configuration not found',
      'http',
      404,
    );
  }

  return parseValidatedDashboardBody(parsed);
}
