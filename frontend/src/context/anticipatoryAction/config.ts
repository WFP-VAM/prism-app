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
  loadAllAAStormData,
} from 'context/anticipatoryAction/AAStormStateSlice';
import {
  AAFloodAvailableDatesSelector as floodAvailableDatesSelector,
  AAFloodDataSelector as floodDataSelector,
  loadAAFloodData,
} from 'context/anticipatoryAction/AAFloodStateSlice';

const anticipatoryActionConfig = {
  [AnticipatoryAction.storm]: {
    dataSelector: stormDataSelector,
    availableDatesSelector: stormAvailableDatesSelector,
    loadAction: loadAllAAStormData,
    setFiltersAction: () => null,
  },
  [AnticipatoryAction.drought]: {
    dataSelector: droughtDataSelector,
    availableDatesSelector: droughtAvailableDatesSelector,
    loadAction: loadDroughtAAData,
    setFiltersAction: setDroughtAAFilters,
  },
  [AnticipatoryAction.flood]: {
    dataSelector: floodDataSelector,
    availableDatesSelector: floodAvailableDatesSelector,
    loadAction: loadAAFloodData,
    setFiltersAction: () => null,
  },
};

export const getAAConfig = (type: AnticipatoryAction) => {
  const config = anticipatoryActionConfig[type];
  if (!config) {
    throw new Error(`No configuration found for AA type: ${type}`);
  }
  return config;
};
