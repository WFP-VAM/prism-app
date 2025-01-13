// // na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
import { DateItem } from 'config/types';
import { AACategory, ParsedStormData } from './parsedStromDataTypes';

export enum WindState {
  monitoring = 'monitoring',
  ready = 'ready',
  activated_64 = 'activated_64',
  activated_118 = 'activated_118',
}
type ShortDate = string;
type CycloneName = string;
export type TimeAndState = { ref_time: string; state: WindState };
export type AAStormWindStateReports = Record<
  ShortDate,
  Record<CycloneName, TimeAndState[]>
>;

export type ResultType = {
  data: ParsedStormData;
};

export const AAPhase = ['Active', 'na'] as const;
export type AAPhaseType = (typeof AAPhase)[number];
// export const phaseValues = Object.values(AAPhase);

// export enum AAView {
//   Activation_trigger = 'Actication Trigger',
//   Readiness_trigger = 'Readiness Trigger',
// }

export type AnticipatoryActionState = {
  data: ParsedStormData;
  windStateReports: AAStormWindStateReports;
  // availableDates used to update layer available dates after csv processed
  availableDates?: DateItem[] | undefined;
  filters: {
    viewType?: 'forecast' | 'risk' | undefined;
    selectedDateTime: string | undefined;
    selectedIndex: string;
    categories: Record<AACategory, boolean>;
  };
  loading: boolean;
  error: string | null;
};
