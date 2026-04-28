import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useIsAuthenticated } from '@azure/msal-react';
import { authRequired, safeCountry } from 'config';
import { fetchDashboardConfig } from 'dashboardConfig/fetchDashboardConfig';
import {
  getDashboardConfigErrorMessage,
  isDashboardConfigNotFoundError,
} from 'dashboardConfig/dashboardConfigQueryError';
import { setDashboards } from 'context/dashboardStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { DASHBOARDS_API_URL } from 'utils/constants';

const RETRY_ATTEMPTS = 3;
const retryDelayMs = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 30_000);

/**
 * Loads published dashboard config from the API (`/dashboards`), scoped to the
 * build's country. An empty list hides the Dashboard nav link. Network or validation
 * errors show a notification after retries (except 404, which is treated as empty).
 */
export function useDashboardConfig(): void {
  const dispatch = useDispatch();
  const isAuthenticated = useIsAuthenticated();
  const enabled = isAuthenticated || !authRequired;
  const url = `${DASHBOARDS_API_URL}?${new URLSearchParams({
    country: safeCountry,
    status: 'published',
  }).toString()}`;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      let lastError: unknown;

      for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
        if (cancelled) {
          return;
        }
        try {
          const data = await fetchDashboardConfig(url);
          if (cancelled) {
            return;
          }
          dispatch(setDashboards(data));
          return;
        } catch (error) {
          if (cancelled) {
            return;
          }
          // Missing config (e.g. 404) is treated as no dashboards: nav link hidden.
          if (isDashboardConfigNotFoundError(error)) {
            dispatch(setDashboards([]));
            return;
          }
          lastError = error;
          if (attempt < RETRY_ATTEMPTS - 1) {
            await new Promise<void>(resolve => {
              setTimeout(resolve, retryDelayMs(attempt));
            });
          }
        }
      }

      if (!cancelled && lastError !== undefined) {
        dispatch(
          addNotification({
            type: 'error',
            message: getDashboardConfigErrorMessage(lastError),
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, enabled, url]);
}
