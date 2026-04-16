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

  // Static hosts (e.g. Firebase Hosting, see frontend/firebase.json) rewrite unknown paths
  // to `/index.html` and return it with status 200, so a missing dashboard.json arrives as
  // HTML — not a 404 — and JSON.parse below would throw. Treat a non-JSON content-type as
  // "not found" so the UI stays silent, matching the 404 path.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    throw new DashboardConfigFetchError(
      'Dashboard configuration not found',
      'http',
      404,
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

  return parseValidatedDashboardBody(parsed);
}
