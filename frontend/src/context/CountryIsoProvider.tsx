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

  // TODO: `isValid`/`isKnown` are exposed but not yet consumed, so an unknown or
  // malformed ISO3 (e.g. /country/ZZZ) silently renders an empty map. Wire these
  // up to render a fallback (UniversalPlaceholder or a dedicated invalid-country
  // page) instead of the map shell.

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

  return (
    <CountryIsoContext.Provider value={value}>
      {children}
    </CountryIsoContext.Provider>
  );
}
