import {
  CycloneName,
  ShortDate,
  TimeAndState,
} from 'context/anticipatoryAction/AAStormStateSlice/types';

export type DateItemStyle = {
  class: string;
  color: string;
  layerDirectionClass?: string;
  emphasis?: string;
};

export type DateJSON = Record<ShortDate, Record<CycloneName, TimeAndState[]>>;

export type WindStateReport = {
  states: TimeAndState[];
  cycloneName: string | null;
};
