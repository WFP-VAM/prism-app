import { useContext } from 'react';

import {
  CountryIsoContext,
  type CountryIsoContextValue,
} from './countryIsoContext';

export function useCountryIso(): CountryIsoContextValue {
  return useContext(CountryIsoContext);
}

export function useOptionalCountryIso(): CountryIsoContextValue | undefined {
  const context = useContext(CountryIsoContext);
  if (!context.iso3) {
    return undefined;
  }
  return context;
}
