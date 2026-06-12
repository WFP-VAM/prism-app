import type { SxProps, Theme } from '@mui/material/styles';
import {
  CycloneName,
  ShortDate,
  TimeAndState,
} from 'context/anticipatoryAction/AAStormStateSlice/types';

export type DateItemStyle = {
  color: string;
  coverageTick?: SxProps<Theme>;
  validityTick?: SxProps<Theme>;
  queryTick?: SxProps<Theme>;
};

export type DateJSON = Record<ShortDate, Record<CycloneName, TimeAndState[]>>;

export type WindStateReport = {
  states: TimeAndState[];
  cycloneName: string | null;
};
