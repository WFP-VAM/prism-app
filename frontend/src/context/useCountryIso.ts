import { useContext } from 'react';

import {
  CountryIsoContext,
  type CountryIsoContextValue,
} from './countryIsoContext';

export function useCountryIso(
  optional?: boolean,
): CountryIsoContextValue | undefined {
  const context = useContext(CountryIsoContext);
  if (optional && !context.iso3) {
    return undefined;
  }
  return context;
}
