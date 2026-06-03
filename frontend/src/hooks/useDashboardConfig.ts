import { useIsAuthenticated } from '@azure/msal-react';
import { authRequired, safeCountry } from 'config';
import { setDashboards } from 'context/dashboardStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import {
  getDashboardConfigErrorMessage,
  isDashboardConfigNotFoundError,
} from 'dashboardConfig/dashboardConfigQueryError';
import { fetchDashboardConfig } from 'dashboardConfig/fetchDashboardConfig';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { DASHBOARDS_API_URL } from 'utils/constants';
import { loadDraftDashboards } from 'utils/draftDashboardStorage';

const RETRY_ATTEMPTS = 3;
const retryDelayMs = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 30_000);

/** Re-enable when published dashboard config load failures should surface in the UI. */
const SHOW_DASHBOARD_CONFIG_LOAD_ERROR = false;

/**
 * Loads published dashboard config from the API (`/dashboards`), scoped to the
 * build's country. An empty list hides the Dashboard nav link. Missing config
 * (404) is treated as empty; other load failures are retried silently for now.
 */
export function useDashboardConfig(): void {
  const dispatch = useDispatch();
  const isAuthenticated = useIsAuthenticated();
  const enabled = isAuthenticated || !authRequired;
  const url = `${DASHBOARDS_API_URL}?${new URLSearchParams({
    country: safeCountry,
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
          const localDrafts = loadDraftDashboards();
          const s3Ids = new Set(data.map(d => d.id).filter(Boolean));
          const newDrafts = localDrafts.filter(d => !d.id || !s3Ids.has(d.id));
          dispatch(setDashboards([...data, ...newDrafts]));
          return;
        } catch (error) {
          if (cancelled) {
            return;
          }
          // Missing config (e.g. 404) is treated as no dashboards: nav link hidden.
          if (isDashboardConfigNotFoundError(error)) {
            const localDrafts = loadDraftDashboards();
            dispatch(setDashboards([...localDrafts]));
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

      if (
        SHOW_DASHBOARD_CONFIG_LOAD_ERROR &&
        !cancelled &&
        lastError !== undefined
      ) {
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
