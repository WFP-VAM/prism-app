import React, { createContext } from 'react';
import type { LngLatBounds } from 'maplibre-gl';
import { AdminCodeString } from 'config/types';
import { AspectRatio } from 'components/MapExport/types';

export type Toggles = {
  fullLayerDescription: boolean;
  countryMask: boolean;
  mapLabelsVisibility: boolean;
  logoVisibility: boolean;
  legendVisibility: boolean;
  footerVisibility: boolean;
  batchMapsVisibility: boolean;
  bottomLogoVisibility: boolean;
  aspectRatioEnabled: boolean;
};

export type MapDimensions = {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
};

export type PrintConfigContextType = {
  printConfig?: {
    handleClose: () => void;
    setTitleText: React.Dispatch<React.SetStateAction<string>>;
    debounceCallback: (
      setState: React.Dispatch<React.SetStateAction<string>>,
      value: string,
    ) => void;
    country: string;
    mapDimensions: MapDimensions;
    setMapDimensions: React.Dispatch<React.SetStateAction<MapDimensions>>;
    logo: string;
    logoPosition: number;
    setLogoPosition: React.Dispatch<React.SetStateAction<number>>;
    logoScale: number;
    setLogoScale: React.Dispatch<React.SetStateAction<number>>;
    bottomLogo: string | undefined;
    bottomLogoScale: number;
    setBottomLogoScale: React.Dispatch<React.SetStateAction<number>>;
    toggles: Toggles;
    setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
    legendPosition: number;
    setLegendPosition: React.Dispatch<React.SetStateAction<number>>;
    setFooterText: React.Dispatch<React.SetStateAction<string>>;
    footerTextSize: number;
    setFooterTextSize: React.Dispatch<React.SetStateAction<number>>;
    downloadMenuAnchorEl: HTMLElement | null;
    handleDownloadMenuOpen: (
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
    handleDownloadMenuClose: () => void;
    download: (format: 'pdf' | 'jpeg' | 'png') => void;
    downloadBatch: (format: 'pdf' | 'png') => Promise<void>;
    isDownloading: boolean;
    defaultFooterText: string;
    selectedBoundaries: AdminCodeString[];
    setSelectedBoundaries: React.Dispatch<
      React.SetStateAction<AdminCodeString[]>
    >;
    legendScale: number;
    setLegendScale: React.Dispatch<React.SetStateAction<number>>;
    open: boolean;
    footerHeight: number;
    setDownloadMenuAnchorEl: (anchorEl: HTMLElement | null) => void;
    titleText: string;
    titleRef: React.RefObject<HTMLDivElement>;
    footerText: string;
    footerRef: React.RefObject<HTMLDivElement>;
    titleHeight: number;
    invertedAdminBoundaryLimitPolygon: any;
    printRef: React.RefObject<HTMLDivElement>;
    dateRange: {
      startDate: number | null;
      endDate: number | null;
    };
    setDateRange: React.Dispatch<
      React.SetStateAction<{
        startDate: number | null;
        endDate: number | null;
      }>
    >;
    mapCount: number;
    shouldEnableBatchMaps: boolean;
    aspectRatioOptions: AspectRatio[];
    previewBounds: LngLatBounds | null;
    setPreviewBounds: React.Dispatch<React.SetStateAction<LngLatBounds | null>>;
    previewZoom: number | null;
    setPreviewZoom: React.Dispatch<React.SetStateAction<number | null>>;
  };
};

const PrintConfigContext = createContext<PrintConfigContextType>({});

export default PrintConfigContext;
