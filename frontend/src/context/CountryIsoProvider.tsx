import CountryInvalidPage from 'components/CountryInvalidPage';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  hasAdmin3ForCountry,
  isKnownIso3,
  isValidIso3Format,
  normalizeIso3,
} from 'utils/universal-utils';

import { CountryIsoContext } from './countryIsoContext';

export function CountryIsoProvider({
  children,
  countryAdmin0Id,
}: {
  children: React.ReactNode;
  countryAdmin0Id?: number;
}) {
  const { iso3: iso3Param } = useParams<{ iso3?: string }>();
  const iso3 = normalizeIso3(iso3Param);
  const isValid = isValidIso3Format(iso3);
  const isKnown = isKnownIso3(iso3);
  const admin3Available = hasAdmin3ForCountry(iso3);

  const value = useMemo(
    () => ({
      iso3,
      isValid,
      isKnown,
      admin3Available,
      countryAdmin0Id,
    }),
    [iso3, countryAdmin0Id],
  );

  if (!isValid) {
    return <CountryInvalidPage />;
  }

  return (
    <CountryIsoContext.Provider value={value}>
      {children}
    </CountryIsoContext.Provider>
  );
}
