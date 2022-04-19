import { AdminLevelType, BoundaryLayerProps } from '../config/types';
import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
} from '../config/utils';

export function getAdminLevelLayer(
  adminLevel: AdminLevelType = 1,
): BoundaryLayerProps {
  const boundaryLayers = getDisplayBoundaryLayers();
  return (
    boundaryLayers.find(layer => layer.adminLevelNames.length === adminLevel) ||
    boundaryLayers[0]
  );
}

export function getAdminLayerURL(adminLevel: AdminLevelType = 1): string {
  const adminLayer = getAdminLevelLayer(adminLevel);
  return adminLayer.path;
}

export function getAdminNameProperty(adminLevel: AdminLevelType = 1): string {
  const { adminLevelNames } = getBoundaryLayerSingleton();
  return adminLevelNames[adminLevel - 1];
}

// get the total number of admin levels available
// if this returns 3 than means we have Admin 1, Admin 2 and Admin 3 available
export function getAdminLevelCount(): number {
  return Math.max(
    ...getDisplayBoundaryLayers().map(layer => layer.adminLevelNames.length),
  );
}
