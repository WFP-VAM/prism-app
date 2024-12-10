import { AnticipatoryAction } from 'config/types';
import {
  AAAvailableDatesSelector as droughtAvailableDatesSelector,
  AADataSelector as droughtDataSelector,
  loadAAData as loadDroughtAAData,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAAvailableDatesSelector as stormAvailableDatesSelector,
  AADataSelector as stormDataSelector,
  loadAAData as loadStormAAData,
} from 'context/anticipatoryAction/AAStormStateSlice';

export const anticipatoryActionConfig = {
  [AnticipatoryAction.storm]: {
    dataSelector: stormDataSelector,
    availableDatesSelector: stormAvailableDatesSelector,
    loadAction: loadStormAAData,
  },
  [AnticipatoryAction.drought]: {
    dataSelector: droughtDataSelector,
    availableDatesSelector: droughtAvailableDatesSelector,
    loadAction: loadDroughtAAData,
  },
};

export const getAAConfig = (type: AnticipatoryAction) => {
  const config = anticipatoryActionConfig[type];
  if (!config) {
    throw new Error(`No configuration found for AA type: ${type}`);
  }
  return config;
};
