import React, { createContext } from 'react';
import { AdminCodeString } from 'config/types';

// Supporting ONLY A4 as of Oct 2025
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

export interface ExportToggles {
  logoVisibility: boolean;
  mapLabelsVisibility: boolean;
  adminAreasVisibility: boolean;
  legendVisibility: boolean;
}

export type DashboardExportContextType = {
  exportConfig?: {
    handleClose: () => void;
    download: (format: 'pdf' | 'png') => void;
    isExporting: boolean;
    printRef: React.RefObject<HTMLDivElement | null>;
    paperSize: PaperSize;
    setPaperSize: React.Dispatch<React.SetStateAction<PaperSize>>;
    toggles: ExportToggles;
    setToggles: React.Dispatch<React.SetStateAction<ExportToggles>>;
    logoPosition: number;
    setLogoPosition: React.Dispatch<React.SetStateAction<number>>;
    logoScale: number;
    setLogoScale: React.Dispatch<React.SetStateAction<number>>;
    legendPosition: number;
    setLegendPosition: React.Dispatch<React.SetStateAction<number>>;
    legendScale: number;
    setLegendScale: React.Dispatch<React.SetStateAction<number>>;
    selectedBoundaries: AdminCodeString[];
    setSelectedBoundaries: (
      boundaries: AdminCodeString[],
      appendMany?: boolean,
    ) => void;
    invertedAdminBoundaryLimitPolygon: any;
    handleDownloadMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
    handleDownloadMenuClose: () => void;
    downloadMenuAnchorEl: HTMLElement | null;
  };
};

const DashboardExportContext = createContext<DashboardExportContextType>({});

export default DashboardExportContext;
