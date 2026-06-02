import { appConfig } from 'config';
import { AdminLevelType, BoundaryLayerProps } from 'config/types';
import { getBoundaryLayersByAdminLevel } from 'config/utils';
import { useCountryIso } from 'context/useCountryIso';
import { useMemo } from 'react';
import { useBoundaryData } from 'utils/useBoundaryData';

import { isUniversalDeployment } from './universal-utils';

export function useEffectiveCountryAdmin0Id(): number | undefined {
  const { iso3 } = useCountryIso();
  const { data: admin0BoundaryData } = useBoundaryData(
    'universal_admin0_boundaries',
  );

  return useMemo(() => {
    if (!isUniversalDeployment()) {
      return appConfig.countryAdmin0Id;
    }

    const adm0Id = admin0BoundaryData?.features?.[0]?.properties?.adm0_id;
    if (adm0Id === undefined || adm0Id === null) {
      return undefined;
    }

    const parsed = Number(adm0Id);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [admin0BoundaryData, iso3]);
}

export function getEffectiveMultiCountry(): boolean {
  return isUniversalDeployment() ? false : Boolean(appConfig.multiCountry);
}

/** Deepest boundary layer available for the active country. */
export function useEffectiveBoundaryLayer(): BoundaryLayerProps {
  const { iso3, admin3Available } = useCountryIso();

  return useMemo(() => {
    if (isUniversalDeployment()) {
      return getBoundaryLayersByAdminLevel(admin3Available ? 4 : 3);
    }
    return getBoundaryLayersByAdminLevel(appConfig.multiCountry ? 3 : 2);
  }, [iso3, admin3Available]);
}

/**
 * Ordered list of (AdminLevelType value, i18n key) pairs for the current country.
 * Admin 0 (country level) is excluded; subnational levels start at Admin 1.
 */
export function useEffectiveAdminLevelOptions(): [AdminLevelType, string][] {
  const boundaryLayer = useEffectiveBoundaryLayer();

  return useMemo(() => {
    // adm0 is always the first code in every universal boundary layer and in
    // multiCountry single-country deployments, so skip one slot to get subnational.
    const offset =
      isUniversalDeployment() || Boolean(appConfig.multiCountry) ? 1 : 0;
    const count = boundaryLayer.adminLevelCodes.length - offset;
    return Array.from({ length: count }, (_, i) => [
      (offset + i + 1) as AdminLevelType,
      `Admin ${i + 1}`,
    ]);
  }, [boundaryLayer]);
}
