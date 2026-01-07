import {
  CycloneName,
  ShortDate,
  TimeAndState,
} from 'context/anticipatoryAction/AAStormStateSlice/types';

export type DateItemStyle = {
  validityClass: string;
  color: string;
  queryClass?: string;
  coverageClass: string;
};

export type DateJSON = Record<ShortDate, Record<CycloneName, TimeAndState[]>>;

export type WindStateReport = {
  states: TimeAndState[];
  cycloneName: string | null;
};
