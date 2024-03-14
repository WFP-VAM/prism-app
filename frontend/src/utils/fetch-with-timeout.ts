import { Dispatch } from 'redux';
import { addNotification } from 'context/notificationStateSlice';
import { HTTPError } from './error-utils';

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export const ANALYSIS_REQUEST_TIMEOUT = 60000;

const DEFAULT_REQUEST_TIMEOUT = 15000;

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
      throw new HTTPError(
        fetchErrorMessage ?? `Something went wrong requesting at ${resource}`,
        res.status,
      );
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
      dispatch(
        addNotification({
          message: (error as HTTPError).message,
          type: 'warning',
        }),
      );
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
};
