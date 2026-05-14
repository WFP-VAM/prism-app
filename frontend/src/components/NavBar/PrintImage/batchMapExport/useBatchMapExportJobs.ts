import { useContext } from 'react';

import { BatchMapExportJobsContext } from './batchMapExportJobsContext';
import type { BatchMapExportJobsContextValue } from './types';

export function useBatchMapExportJobs(): BatchMapExportJobsContextValue {
  const ctx = useContext(BatchMapExportJobsContext);
  if (!ctx) {
    throw new Error(
      'useBatchMapExportJobs must be used within BatchMapExportJobsProvider',
    );
  }
  return ctx;
}
