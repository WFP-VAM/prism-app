import type { GeoJSON } from 'geojson';

export type WCSConfig = {
  scale?: number;
  offset?: number;
  pixelResolution?: number;
};

export type AlertConfig = {
  id: string;
  type: string;
  title: string;
  serverLayerName: string;
  baseUrl: string;
  wcsConfig: WCSConfig;
};

/** Application shape for threshold alerts (maps from `alert` table, snake_case → camelCase). */
export type Alert = {
  id: number;
  email: string;
  prismUrl: string;
  alertName?: string;
  alertConfig: AlertConfig;
  min?: number;
  max?: number;
  zones?: GeoJSON;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
};
