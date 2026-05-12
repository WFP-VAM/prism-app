import { createContext } from 'react';
import type { BatchMapExportJobsContextValue } from './types';

export const BatchMapExportJobsContext =
  createContext<BatchMapExportJobsContextValue | null>(null);
