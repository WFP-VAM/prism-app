import React from 'react';
import maplibregl from 'maplibre-gl';
import { AdminCodeString, LayerType } from 'config/types';

export interface MapExportToggles {
  fullLayerDescription: boolean;
  countryMask: boolean;
  mapLabelsVisibility: boolean;
  logoVisibility: boolean;
  legendVisibility: boolean;
  footerVisibility: boolean;
}

export interface ExportMapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ExportParams {
  // Layer state (existing pattern)
  hazardLayerIds: string[];
  baselineLayerIds: string[];
  date: string | null;

  // Map bounds (new)
  bounds: ExportMapBounds | null;
  zoom: number | null;

  // Print config options
  mapWidth: number; // 50-100
  titleText: string;
  footerText: string;
  footerTextSize: number; // 8, 10, 12, 16, 20

  // Position/scale options
  logoPosition: number; // 0 = left, 1 = right
  logoScale: number; // 0.5, 1, 1.5
  legendPosition: number; // 0 = left, 1 = right
  legendScale: number; // 0 to 0.5

  // Toggles
  toggles: MapExportToggles;

  // Admin boundary selection for mask
  selectedBoundaries: AdminCodeString[];
}

export interface MapExportLayoutProps {
  // Display toggles
  toggles: MapExportToggles;

  // Dimensions
  mapWidth: number; // percentage 50-100
  mapHeight?: number; // percentage (defaults to 100)

  // Title/Footer
  titleText: string;
  footerText: string;
  footerTextSize: number;
  dateText?: string; // Formatted date string for footer

  // Logo
  logo?: string;
  logoPosition: number;
  logoScale: number;
  titleHeight?: number; // Height of title bar (for logo positioning when no title)

  // Legend
  legendPosition: number;
  legendScale: number;

  // Map view state
  initialViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };

  // Map style (from existing map or base style)
  mapStyle: maplibregl.StyleSpecification | string;

  // Optional bounds constraint
  maxBounds?: maplibregl.LngLatBoundsLike;

  // Country mask polygon (computed from selected boundaries)
  invertedAdminBoundaryLimitPolygon?: GeoJSON.Feature | null;

  // For capturing the rendered output
  printRef?: React.RefObject<HTMLDivElement>;
  titleRef?: React.RefObject<HTMLDivElement>;
  footerRef?: React.RefObject<HTMLDivElement>;

  // Footer height for positioning scale bar and north arrow
  footerHeight?: number;

  // AA markers (for anticipatory action layers)
  aaMarkers?: Array<{
    district: string;
    longitude: number;
    latitude: number;
    icon: React.ReactNode;
  }>;
  floodStations?: Array<any>;
  activePanel?: string; // Panel.AnticipatoryActionDrought | Panel.AnticipatoryActionFlood

  // Layers with fill patterns (for loading images)
  adminLevelLayersWithFillPattern?: Array<any>;

  // Selected layers to render on the map
  // NOTE: Layer rendering logic must be kept in sync with MapView/Map/index.tsx
  selectedLayers?: LayerType[];

  // Callback for map load
  onMapLoad?: (e: any) => void;
}
