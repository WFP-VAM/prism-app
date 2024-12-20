import { AnticipatoryAction } from 'config/types';
import {
  AAAvailableDatesSelector as droughtAvailableDatesSelector,
  AADataSelector as droughtDataSelector,
  loadAAData as loadDroughtAAData,
  setAAFilters as setDroughtAAFilters,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAAvailableDatesSelector as stormAvailableDatesSelector,
  AADataSelector as stormDataSelector,
  loadAAData as loadStormAAData,
  setAAFilters as setStormAAFilters,
} from 'context/anticipatoryAction/AAStormStateSlice';

export const anticipatoryActionConfig = {
  [AnticipatoryAction.storm]: {
    dataSelector: stormDataSelector,
    availableDatesSelector: stormAvailableDatesSelector,
    loadAction: loadStormAAData,
    setFiltersAction: setStormAAFilters,
  },
  [AnticipatoryAction.drought]: {
    dataSelector: droughtDataSelector,
    availableDatesSelector: droughtAvailableDatesSelector,
    loadAction: loadDroughtAAData,
    setFiltersAction: setDroughtAAFilters,
  },
};

export const getAAConfig = (type: AnticipatoryAction) => {
  const config = anticipatoryActionConfig[type];
  if (!config) {
    throw new Error(`No configuration found for AA type: ${type}`);
  }
  return config;
};
