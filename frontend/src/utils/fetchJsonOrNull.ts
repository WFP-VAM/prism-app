export class FetchJsonError extends Error {
  constructor(
    message: string,
    public readonly causeType: 'http' | 'network' | 'json',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'FetchJsonError';
  }
}

export async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    throw new FetchJsonError(
      `Network error fetching ${url}: ${message}`,
      'network',
    );
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new FetchJsonError(
      `HTTP error fetching ${url} (${response.status} ${response.statusText})`,
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
    throw new FetchJsonError(`Invalid JSON in ${url}`, 'json');
  }
}
