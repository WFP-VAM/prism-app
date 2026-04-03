import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useIsAuthenticated } from '@azure/msal-react';
import {
  authRequired,
  dashboardConfigUrl,
  localDashboardConfigUrl,
} from 'config';
import { fetchDashboardConfig } from 'dashboardConfig/fetchDashboardConfig';
import { getDashboardConfigErrorMessage } from 'dashboardConfig/dashboardConfigQueryError';
import { setDashboards } from 'context/dashboardStateSlice';
import { addNotification } from 'context/notificationStateSlice';

const RETRY_ATTEMPTS = 3;
const retryDelayMs = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 30_000);

/**
 * Loads dashboard.json from S3 when `dashboardConfigUrl` is set; otherwise from
 * `localDashboardConfigUrl` (`public/{country}/dashboard.json`). Add that file under
 * `frontend/public/` locally if you want to test dashboards without S3.
 */
export function useDashboardConfig(): void {
  const dispatch = useDispatch();
  const isAuthenticated = useIsAuthenticated();
  const enabled = isAuthenticated || !authRequired;
  const url = dashboardConfigUrl ?? localDashboardConfigUrl;

  useEffect(() => {
    if (!enabled || !url) {
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
          lastError = error;
          if (cancelled) {
            return;
          }
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
