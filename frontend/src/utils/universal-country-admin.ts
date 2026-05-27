import { appConfig } from 'config';
import { useCountryIso } from 'context/useCountryIso';
import { useMemo } from 'react';
import { useBoundaryData } from 'utils/useBoundaryData';

import { isUrlDrivenDeployment } from './universal-utils';

export function useEffectiveCountryAdmin0Id(): number | undefined {
  const { iso3 } = useCountryIso();
  const { data: admin0BoundaryData } = useBoundaryData(
    'universal_admin0_boundaries',
  );

  return useMemo(() => {
    if (!isUrlDrivenDeployment()) {
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
  return isUrlDrivenDeployment() ? false : Boolean(appConfig.multiCountry);
}

export function useEffectiveMultiCountry(): boolean {
  return getEffectiveMultiCountry();
}
