import { WindState } from 'prism-common/dist/types/anticipatory-action-storm/windState';

export type LastStates = {
  [stormName: string]: {
    status: WindState;
    refTime: string;
  };
};

export interface ShortReport {
  ref_time: string;
  state: WindState;
  path: string;
}

export interface ShortReportsResponseBody {
  [date: string]: {
    [stormName: string]: ShortReport[];
  };
}
