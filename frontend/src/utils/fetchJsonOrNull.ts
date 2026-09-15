export class JsonFetchError extends Error {
  constructor(
    message: string,
    public readonly causeType: 'http' | 'network' | 'json',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'JsonFetchError';
  }
}

/**
 * Fetches a JSON resource, treating a missing file as a normal outcome.
 *
 * Returns `null` for HTTP 404 responses and for OK responses whose
 * content-type is not JSON: static hosts (e.g. Firebase Hosting, see
 * frontend/firebase.json) rewrite unknown paths to `/index.html` and return
 * it with status 200, so a missing file arrives as HTML rather than a 404.
 *
 * Throws `JsonFetchError` with a distinct `causeType` for network failures
 * ('network'), non-OK statuses other than 404 ('http'), and bodies that fail
 * to parse as JSON ('json'), so callers can tell "file not configured" apart
 * from "file exists but is broken".
 */
export async function fetchJsonOrNull<T = unknown>(
  url: string,
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    throw new JsonFetchError(`Could not load ${url}: ${message}`, 'network');
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new JsonFetchError(
      `Request for ${url} failed (${response.status} ${response.statusText})`,
      'http',
      response.status,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new JsonFetchError(`Response from ${url} is not valid JSON`, 'json');
  }
}
