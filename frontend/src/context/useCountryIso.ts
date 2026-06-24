import { useContext } from 'react';

import {
  CountryIsoContext,
  type CountryIsoContextValue,
} from './countryIsoContext';

export function useCountryIso<const T extends boolean = false>(
  optional?: T,
): T extends true
  ? CountryIsoContextValue | undefined
  : CountryIsoContextValue {
  const context = useContext(CountryIsoContext);
  if (optional && !context.iso3) {
    return undefined as T extends true
      ? CountryIsoContextValue | undefined
      : CountryIsoContextValue;
  }
  return context as T extends true
    ? CountryIsoContextValue | undefined
    : CountryIsoContextValue;
}
