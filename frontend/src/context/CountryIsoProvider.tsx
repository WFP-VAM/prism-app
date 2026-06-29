import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  hasAdmin3ForCountry,
  isKnownIso3,
  isValidIso3Format,
  normalizeIso3,
} from 'utils/universal-utils';

import { CountryIsoContext } from './countryIsoContext';
import { addNotification } from './notificationStateSlice';

export function CountryIsoProvider({
  children,
  countryAdmin0Id,
}: {
  children: React.ReactNode;
  countryAdmin0Id?: number;
}) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { iso3: iso3Param } = useParams<{ iso3?: string }>();
  const iso3 = normalizeIso3(iso3Param);
  const isValid = isValidIso3Format(iso3);
  const isKnown = isKnownIso3(iso3);
  const admin3Available = hasAdmin3ForCountry(iso3);
  const isUnknownCountry = Boolean(iso3) && !isKnown;
  const effectiveIso3 = isKnown ? iso3 : undefined;

  useEffect(() => {
    if (isUnknownCountry) {
      dispatch(
        addNotification({
          type: 'warning',
          message: t(
            'The country code "{{iso3}}" does not match any available country in PRISM. Showing all countries instead.',
            { iso3 },
          ),
        }),
      );
    }
  }, [isUnknownCountry, iso3, dispatch, t]);

  const value = useMemo(
    () => ({
      iso3: effectiveIso3,
      isValid,
      isKnown,
      admin3Available,
      countryAdmin0Id,
    }),
    [effectiveIso3, isValid, isKnown, admin3Available, countryAdmin0Id],
  );

  return (
    <CountryIsoContext.Provider value={value}>
      {children}
    </CountryIsoContext.Provider>
  );
}
