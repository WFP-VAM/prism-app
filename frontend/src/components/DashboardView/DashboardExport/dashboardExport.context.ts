import React, { createContext } from 'react';

export enum PaperSize {
  BROWSER = 'browser',
  US_LETTER_LANDSCAPE = 'us-letter-landscape',
  A4_LANDSCAPE = 'a4-landscape',
}

export interface PaperDimensions {
  width: number;
  height: number;
}

export const PAPER_SIZES: Record<PaperSize, PaperDimensions> = {
  [PaperSize.BROWSER]: { width: 0, height: 0 }, // Will use actual browser dimensions
  [PaperSize.US_LETTER_LANDSCAPE]: { width: 1056, height: 816 },
  [PaperSize.A4_LANDSCAPE]: { width: 1123, height: 794 },
};

export type DashboardExportContextType = {
  exportConfig?: {
    handleClose: () => void;
    download: (format: 'pdf' | 'png') => void;
    downloadFormat: 'pdf' | 'png';
    setDownloadFormat: React.Dispatch<React.SetStateAction<'pdf' | 'png'>>;
    isExporting: boolean;
    printRef: React.RefObject<HTMLDivElement>;
    paperSize: PaperSize;
    setPaperSize: React.Dispatch<React.SetStateAction<PaperSize>>;
  };
};

const DashboardExportContext = createContext<DashboardExportContextType>({});

export default DashboardExportContext;
