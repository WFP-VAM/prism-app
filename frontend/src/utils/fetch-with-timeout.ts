import { Dispatch } from 'redux';
import { addNotification } from 'context/notificationStateSlice';
import { HTTPError } from './error-utils';

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export const ANALYSIS_REQUEST_TIMEOUT = 60000;

const DEFAULT_REQUEST_TIMEOUT = 30000;

export const fetchWithTimeout = async (
  resource: RequestInfo,
  dispatch?: Dispatch,
  options?: FetchWithTimeoutOptions,
  fetchErrorMessage?: string,
): Promise<Response> => {
  const controller = new AbortController();
  // the setTimeout id to abort the request
  const id = setTimeout(
    () => controller.abort(),
    options?.timeout ?? DEFAULT_REQUEST_TIMEOUT,
  );
  try {
    // the propagated response
    const res = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json();
      const detail =
        body.detail === 'string' ? body.detail : body.detail?.[0]?.msg;
      const message =
        detail ??
        fetchErrorMessage ??
        `Something went wrong requesting at ${resource}`;
      console.error('New HTTP Error: ', {
        message,
        statusCode: res.status,
      });
      throw new HTTPError(message, res.status);
    }
    return res;
  } catch (error) {
    console.error(error);
    if (!dispatch) {
      throw error;
    }
    if ((error as any).name === 'AbortError') {
      dispatch(
        addNotification({
          message: `Request at ${resource} timeout`,
          type: 'warning',
        }),
      );
    } else if ((error as HTTPError)?.statusCode === 401) {
      dispatch(
        addNotification({
          message: 'Authentication failed',
          type: 'warning',
        }),
      );
    } else {
      const errorMessage =
        fetchErrorMessage ||
        (error as HTTPError).message ||
        (error as Error).message ||
        `Failed to fetch from ${resource}`;
      dispatch(
        addNotification({
          message: errorMessage,
          type: 'warning',
        }),
      );
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
};
