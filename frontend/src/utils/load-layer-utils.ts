import { Dispatch } from 'redux';
import { catchErrorAndDispatchNotification } from './error-utils';
import { fetchWithTimeout } from './fetch-with-timeout';

export const loadLayerContent = async (
  path: string,
  dispatch: Dispatch,
): Promise<string> => {
  try {
    const resp = await fetchWithTimeout(path);
    return resp.text();
  } catch (error) {
    return catchErrorAndDispatchNotification(
      new Error('Something went wrong loading layer content'),
      dispatch,
      '',
      'load layer content request timeout',
    );
  }
};
