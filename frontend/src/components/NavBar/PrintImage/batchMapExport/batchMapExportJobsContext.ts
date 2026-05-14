import { createContext } from 'react';

import type {
  BatchMapExportJobsActionsContextValue,
  BatchMapExportJobsStateContextValue,
} from './types';

/** Stable across job polling — enqueue / dismiss only. */
export const BatchMapExportJobsActionsContext =
  createContext<BatchMapExportJobsActionsContextValue | null>(null);

/** Updates when export job progress / list changes (~2s while polling). */
export const BatchMapExportJobsStateContext =
  createContext<BatchMapExportJobsStateContextValue | null>(null);
