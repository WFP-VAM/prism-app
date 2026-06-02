import { createContext } from 'react';

export type CountryIsoContextValue = {
  iso3: string | undefined;
  isValid: boolean;
  isKnown: boolean;
  admin3Available: boolean;
  countryAdmin0Id: number | undefined;
};

export const CountryIsoContext = createContext<CountryIsoContextValue>({
  iso3: undefined,
  isValid: false,
  isKnown: false,
  admin3Available: false,
  countryAdmin0Id: undefined,
});
