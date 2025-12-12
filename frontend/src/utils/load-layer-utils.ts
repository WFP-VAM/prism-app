import { Dispatch } from 'redux';
import { fetchWithTimeout } from './fetch-with-timeout';

export const loadLayerContent = async (
  path: string,
  dispatch: Dispatch,
): Promise<string> => {
  try {
    const resp = await fetchWithTimeout(
      path,
      dispatch,
      {},
      `Request failed for loading layer content at ${path}`,
    );
    return resp.text();
  } catch (_error) {
    return '';
  }
};
