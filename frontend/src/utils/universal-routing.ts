import { isUrlDrivenDeployment } from 'utils/universal-utils';

export function getUniversalBasePath(iso3?: string): string {
  if (!iso3) {
    return '/';
  }
  return `/country/${iso3}`;
}

export function getUniversalMapPath(iso3?: string): string {
  return getUniversalBasePath(iso3);
}

export function getUniversalDashboardPath(
  iso3?: string,
  dashboardSlug?: string,
): string {
  const base = getUniversalBasePath(iso3);
  if (!dashboardSlug) {
    return `${base}/dashboard`;
  }
  return `${base}/dashboard/${dashboardSlug}`;
}

export function isUniversalRouteActive(): boolean {
  return isUrlDrivenDeployment();
}
