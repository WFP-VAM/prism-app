import { WindState } from './rawStormDataTypes';

export type LastStates = {
  [stormName: string]: {
    status: WindState;
    refTime: string;
  };
};

export interface ShortReport {
  ref_time: string;
  state: string;
  path: string;
}

export interface ShortReportsResponseBody {
  [date: string]: {
    [stormName: string]: ShortReport[];
  };
}
