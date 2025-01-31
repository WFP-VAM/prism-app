export interface EmailPayload {}

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
