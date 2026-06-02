export function getUniversalMapPath(iso3?: string): string {
  if (!iso3) {
    return '/';
  }
  return `/country/${iso3}`;
}

export function getUniversalDashboardPath(
  iso3?: string,
  dashboardSlug?: string,
): string {
  const base = getUniversalMapPath(iso3);
  if (!dashboardSlug) {
    return `${base}/dashboard`;
  }
  return `${base}/dashboard/${dashboardSlug}`;
}
