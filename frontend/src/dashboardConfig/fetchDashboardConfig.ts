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
 * Fetches dashboard.json, parses JSON, and validates against the dashboard schema.
 * Each country ships `public/data/{country}/dashboard.json` (use `[]` when there are no dashboards).
 * Remote `dashboardConfigUrl` (S3) may still 404 if the object is absent.
 */
export async function fetchDashboardConfig(url: string): Promise<Dashboard[]> {
  let response: Response;
  try {
    // Avoid 304 + empty body: fetch() does not apply cached bytes to the body, which would
    // look like an empty config.
    response = await fetch(url, { cache: 'no-store' });
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

  const rawText = await response.text();
  if (rawText.trim() === '') {
    return parseValidatedDashboardBody([]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    throw new DashboardConfigFetchError(
      'Dashboard configuration is not valid JSON',
      'json',
    );
  }

  return parseValidatedDashboardBody(parsed);
}
