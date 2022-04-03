import { AdminLevelType, BoundaryLayerProps } from '../config/types';
import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
} from '../config/utils';

export function getAdminLevelLayer(
  adminLevel: AdminLevelType = 1,
): BoundaryLayerProps | undefined {
  const layers = getDisplayBoundaryLayers();
  return layers.find(layer => layer.adminLevelNames.length === adminLevel);
}

export function getAdminLayerURL(adminLevel: AdminLevelType = 1): string {
  const boundaryLayers = getDisplayBoundaryLayers();
  const adminLayer = getAdminLevelLayer(adminLevel);
  return adminLayer ? adminLayer.path : boundaryLayers[0].path;
}

export function getAdminNameProperty(adminLevel: AdminLevelType = 1): string {
  const { adminLevelNames } = getBoundaryLayerSingleton();
  return adminLevelNames[adminLevel - 1];
}
