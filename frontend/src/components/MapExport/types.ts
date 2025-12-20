import React from 'react';
import type {
  StyleSpecification,
  LngLatBoundsLike,
  LngLatBounds,
} from 'maplibre-gl';
import { AdminCodeString, LayerType } from 'config/types';

export type AspectRatio =
  | 'Auto'
  | '4:3'
  | '1:1'
  | '3:2'
  | '6:5'
  | '2:3'
  | 'A4-P'
  | 'A4-L'
  | { w: number; h: number };

export function isCustomRatio(
  ratio: AspectRatio,
): ratio is { w: number; h: number } {
  return typeof ratio === 'object';
}

export function isAutoRatio(ratio: AspectRatio): ratio is 'Auto' {
  return ratio === 'Auto';
}

export interface MapExportToggles {
  fullLayerDescription: boolean;
  countryMask: boolean;
  mapLabelsVisibility: boolean;
  logoVisibility: boolean;
  legendVisibility: boolean;
  footerVisibility: boolean;
  bottomLogoVisibility?: boolean;
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
  mapHeight: number; // percentage (defaults to 100)
  aspectRatio: AspectRatio;
  titleText: string;
  footerText: string;
  footerTextSize: number; // 8, 10, 12, 16, 20

  // Position/scale options
  logoPosition: number; // 0 = left, 1 = right
  logoScale: number; // 0.5, 1, 1.5
  legendPosition: number; // 0 = left, 1 = right
  legendScale: number; // 0.5 to 1 (50% to 100%)
  bottomLogoScale: number; // 0.5, 1, 1.5

  // Toggles
  toggles: MapExportToggles;

  // Admin boundary selection for mask
  selectedBoundaries: AdminCodeString[];
}

export interface MapExportLayoutProps {
  // Display toggles
  toggles: MapExportToggles;

  // Aspect ratio - map always maintains this ratio
  aspectRatio: AspectRatio;

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

  // Bottom Logo (e.g., for Somalia country-specific branding)
  bottomLogo?: string;
  bottomLogoScale?: number;

  // Legend
  legendPosition: number;
  legendScale: number;

  // Map view state
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };

  // Bounds to fit map to
  bounds?: ExportMapBounds;

  // Map style (from existing map or base style)
  mapStyle: StyleSpecification | string;

  // Optional bounds constraint
  maxBounds?: LngLatBoundsLike;

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

  // Callback for map load (called after all sources are loaded)
  onMapLoad?: (e: any) => void;

  // Callback when map bounds/zoom change (for capturing preview state)
  onBoundsChange?: (bounds: LngLatBounds, zoom: number) => void;

  // Callback when map dimensions change (for capturing dimensions when aspectRatio is 'Auto')
  onMapDimensionsChange?: (width: number, height: number) => void;

  // When true, sets window.PRISM_READY = true after all sources load.
  // Used by ExportView for server-side rendering with Playwright.
  signalExportReady?: boolean;
}
