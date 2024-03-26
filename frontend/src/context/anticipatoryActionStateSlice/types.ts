// na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
import { DateItem } from 'config/types';
import { AAWindowKeys } from 'config/utils';
// NOTE: order matters for AADataSeverityOrder
export const AAcategory = ['ny', 'na', 'Mild', 'Moderate', 'Severe'] as const;
export type AACategoryType = typeof AAcategory[number];

export const AAPhase = ['ny', 'na', 'Ready', 'Set'] as const;
export type AAPhaseType = typeof AAPhase[number];

export interface AnticipatoryActionDataRow {
  category: AACategoryType;
  district: string;
  index: string;
  phase: AAPhaseType;
  probability: number;
  trigger: number;
  type: string;
  window: typeof AAWindowKeys[number];
  date: string;
  new: boolean;
  isValid?: boolean;
  computedRow?: boolean;
}

export interface AnticipatoryActionData {
  [k: string]: AnticipatoryActionDataRow[];
}

export const allWindowsKey = 'All';

export type AnticipatoryActionState = {
  data: { [windowKey: string]: AnticipatoryActionData | undefined };
  // availableDates used to update layer available dates after csv processed
  availableDates?: { [windowKey: string]: DateItem[] };
  filters: {
    selectedDate: string | undefined;
    selectedWindow: typeof AAWindowKeys[number] | typeof allWindowsKey;
    categories: Record<AACategoryType, boolean>;
  };
  renderedDistricts: Record<
    typeof AAWindowKeys[number],
    {
      [district: string]: {
        category: AACategoryType;
        phase: AAPhaseType;
        isNew: boolean;
      };
    }
  >;
  loading: boolean;
  error: string | null;
};
