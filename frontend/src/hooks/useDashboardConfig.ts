import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useIsAuthenticated } from '@azure/msal-react';
import {
  authRequired,
  dashboardConfigUrl,
  localDashboardConfigUrl,
} from 'config';
import { fetchDashboardConfig } from 'config/dashboard/fetchDashboardConfig';
import { getDashboardConfigErrorMessage } from 'config/dashboard/dashboardConfigQueryError';
import { setDashboards } from 'context/dashboardStateSlice';
import { addNotification } from 'context/notificationStateSlice';

/**
 * Loads dashboard.json from S3 when `dashboardConfigUrl` is set; otherwise from
 * `localDashboardConfigUrl` (`public/{country}/dashboard.json`). Add that file under
 * `frontend/public/` locally if you want to test dashboards without S3.
 */
export function useDashboardConfig() {
  const dispatch = useDispatch();
  const isAuthenticated = useIsAuthenticated();
  const enabled = isAuthenticated || !authRequired;

  const { data, status, error, fetchStatus } = useQuery({
    queryKey: [
      'dashboardConfig',
      dashboardConfigUrl ?? localDashboardConfigUrl,
    ],
    queryFn: () =>
      fetchDashboardConfig(dashboardConfigUrl ?? localDashboardConfigUrl),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (status === 'success' && data) {
      dispatch(setDashboards(data));
    }
  }, [status, data, dispatch]);

  useEffect(() => {
    if (status === 'error' && error) {
      dispatch(
        addNotification({
          type: 'error',
          message: getDashboardConfigErrorMessage(error),
        }),
      );
    }
  }, [status, error, dispatch]);

  return { status, fetchStatus, error, enabled };
}
