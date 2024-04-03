// na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
import { DateItem } from 'config/types';
import { AAWindowKeys } from 'config/utils';
import React from 'react';

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
  wasReadyValid?: boolean;
  computedRow?: boolean;
}

export interface AnticipatoryActionData {
  [k: string]: AnticipatoryActionDataRow[];
}

export const allWindowsKey = 'All';

export enum AAView {
  Home = 'home',
  District = 'district',
  Timeline = 'timeline',
}

export type AnticipatoryActionState = {
  data: Record<typeof AAWindowKeys[number], AnticipatoryActionData>;
  // availableDates used to update layer available dates after csv processed
  availableDates?: { [windowKey: string]: DateItem[] };
  monitoredDistricts: string[];
  filters: {
    selectedDate: string | undefined;
    selectedWindow: typeof AAWindowKeys[number] | typeof allWindowsKey;
    selectedIndex: string;
    categories: Record<AACategoryType, boolean>;
  };
  selectedDistrict: string;
  renderedDistricts: Record<
    typeof AAWindowKeys[number],
    {
      [district: string]: {
        category: AACategoryType;
        phase: AAPhaseType;
        isNew: boolean;
      }[];
    }
  >;
  markers: {
    district: string;
    longitude: any;
    latitude: any;
    icon: React.JSX.Element;
    centroid: any;
  }[];
  windowRanges: Record<
    typeof AAWindowKeys[number],
    { start: string; end: string } | undefined
  >;
  view: AAView;
  loading: boolean;
  error: string | null;
};
