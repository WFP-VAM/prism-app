import {
  CycloneName,
  ShortDate,
  TimeAndState,
} from 'context/anticipatoryAction/AAStormStateSlice/types';

export type DateItemStyle = {
  color: string;
  coverageTick?: string;
  validityTick?: string;
  queryTick?: string;
};

export type DateJSON = Record<ShortDate, Record<CycloneName, TimeAndState[]>>;

export type WindStateReport = {
  states: TimeAndState[];
  cycloneName: string | null;
};
