// // na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
import { DateItem } from 'config/types';
import { WindState } from 'prism-common/dist/types/anticipatory-action-storm/windState';
import { ParsedStormData } from './parsedStormDataTypes';

export type ShortDate = string;
export type CycloneName = string;
export type TimeAndState = { ref_time: string; state: WindState };
export type AAStormWindStateReports = Record<
  ShortDate,
  Record<CycloneName, TimeAndState[]>
>;

export const AAPhase = ['Active', 'na'] as const;
export type AAPhaseType = (typeof AAPhase)[number];

export type AnticipatoryActionState = {
  data: ParsedStormData;
  windStateReports: AAStormWindStateReports;
  selectedStormName: string | undefined;
  // availableDates used to update layer available dates after csv processed
  availableDates?: DateItem[] | undefined;
  loading: boolean;
  error: string | null;
};
