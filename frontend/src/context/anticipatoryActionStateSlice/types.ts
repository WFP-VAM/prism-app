// na/ny are not actually found in CSV, but defined not to cause confusion when calling the functions
// NOTE: order matters for AADataSeverityOrder
export const AAcategory = ['ny', 'na', 'Leve', 'Moderado', 'Severo'] as const;
export type AACategoryType = typeof AAcategory[number];

export const AAPhase = ['ny', 'na', 'Ready', 'Set'] as const;
export type AAPhaseType = typeof AAPhase[number];

export interface AnticipatoryActionDataRow {
  category: AACategoryType;
  district: string;
  index: string;
  month: string;
  phase: AAPhaseType;
  probability: string;
  trigger: string;
  triggerNB: string;
  triggerType: string;
  type: string;
  windows: string;
  yearOfIssue: string;
  date: string;
}

export interface AnticipatoryActionData {
  [k: string]: AnticipatoryActionDataRow[];
}
