import { Style } from '@react-pdf/types';
import { TFunctionResult } from 'i18next';

export interface PDFLegendDefinition {
  value: string | number | TFunctionResult;
  style: Style | Style[];
}

// This numbers depends on table header and row height
export const MAX_TABLE_ROWS_PER_PAGE = 29;
export const FIRST_PAGE_TABLE_ROWS = 9;
