import { FeatureCollection } from 'geojson';

import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
} from '../config/utils';

export function getAdminLayerURL(adminLevel = 1): string {
  const layers = getDisplayBoundaryLayers();
  const adminLayer = layers.find(
    layer => layer.adminLevelNames.length === adminLevel,
  );
  return adminLayer ? adminLayer.path : layers[0].path;
}

export function getAdminNameProperty(adminLevel: number = 1): string {
  const { adminLevelNames } = getBoundaryLayerSingleton();
  return adminLevelNames[adminLevel - 1];
}

export function fetchAdminLayerGeoJSON(
  adminLevel = 1,
): Promise<FeatureCollection> {
  const url = getAdminLayerURL(adminLevel);
  return fetch(url).then(r => r.json());
}
