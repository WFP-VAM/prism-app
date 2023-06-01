interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export const fetchWithTimeout = async (
  resource: RequestInfo,
  options: FetchWithTimeoutOptions = { timeout: 80000 },
): Promise<Response> => {
  // The abort controller
  const controller = new AbortController();
  // the setTimeout id to abort the request
  const id = setTimeout(() => controller.abort(), options.timeout);
  // the propagated response
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  // Clear the timeout
  clearTimeout(id);
  return response;
};
