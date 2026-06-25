import { PRISM_WHOAMI_API_URL } from './constants';

export type PrismWhoami = {
  user_id: string;
  ciam_sub: string;
  email: string | null;
  permissions: string[];
};

let cached: PrismWhoami | null = null;
let inflight: Promise<PrismWhoami | null> | null = null;

export function invalidatePrismWhoamiSession(): void {
  cached = null;
  inflight = null;
}

async function requestWhoami(): Promise<PrismWhoami | null> {
  try {
    const response = await fetch(PRISM_WHOAMI_API_URL, {
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PrismWhoami;
  } catch {
    return null;
  }
}

/** Credentialed whoami probe; deduped and cached per browser session. */
export function fetchPrismWhoami(options?: {
  bypassCache?: boolean;
}): Promise<PrismWhoami | null> {
  if (!options?.bypassCache && cached !== null) {
    return Promise.resolve(cached);
  }
  if (!options?.bypassCache && inflight !== null) {
    return inflight;
  }

  const request = requestWhoami().then(result => {
    cached = result;
    inflight = null;
    return result;
  });
  inflight = request;
  return request;
}
