import { useContext, useMemo } from 'react';

import {
  BatchMapExportJobsActionsContext,
  BatchMapExportJobsStateContext,
} from './batchMapExportJobsContext';
import type { BatchMapExportJobsContextValue } from './types';

export function useBatchMapExportJobsActions() {
  const ctx = useContext(BatchMapExportJobsActionsContext);
  if (!ctx) {
    throw new Error(
      'useBatchMapExportJobsActions must be used within BatchMapExportJobsProvider',
    );
  }
  return ctx;
}

export function useBatchMapExportJobsState() {
  const ctx = useContext(BatchMapExportJobsStateContext);
  if (!ctx) {
    throw new Error(
      'useBatchMapExportJobsState must be used within BatchMapExportJobsProvider',
    );
  }
  return ctx;
}

/** Subscribes to both actions and job list — re-renders on every job poll. Prefer split hooks when possible. */
export function useBatchMapExportJobs(): BatchMapExportJobsContextValue {
  const actions = useBatchMapExportJobsActions();
  const state = useBatchMapExportJobsState();
  return useMemo(
    () => ({ ...actions, ...state }),
    [actions, state],
  );
}
