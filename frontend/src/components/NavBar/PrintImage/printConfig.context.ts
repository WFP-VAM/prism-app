import React, { createContext } from 'react';
import { AdminCodeString } from 'config/types';

export type Toggles = {
  fullLayerDescription: boolean;
  countryMask: boolean;
  mapLabelsVisibility: boolean;
  logoVisibility: boolean;
  legendVisibility: boolean;
  footerVisibility: boolean;
};

export type MapDimensions = { width: number; height: number };

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
    titleRef: React.RefObject<HTMLDivElement | null>;
    footerText: string;
    footerRef: React.RefObject<HTMLDivElement | null>;
    titleHeight: number;
    invertedAdminBoundaryLimitPolygon: any;
    printRef: React.RefObject<HTMLDivElement | null>;
  };
};

const PrintConfigContext = createContext<PrintConfigContextType>({});

export default PrintConfigContext;
