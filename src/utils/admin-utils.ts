import {
  AdminLevelType,
  DatasetLevel,
  BoundaryLayerProps,
  WMSLayerProps,
} from '../config/types';
import {
  getBoundaryLayerSingleton,
  getDisplayBoundaryLayers,
} from '../config/utils';

import { AdminBoundaryParams } from '../context/datasetStateSlice';

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

// Returns the lowest admin boundary level from chartData (latest element from levels array).
const getLowestLevelBoundaryId = (levels: DatasetLevel[]): string =>
  levels[levels.length - 1].id;

// Creates the AdminBoundaryParams object used to display administrative boundary information within chart component.
export const getChartAdminBoundaryParams = (
  layer: WMSLayerProps,
  properties: { [key: string]: any },
): AdminBoundaryParams => {
  const { serverLayerName, chartData } = layer;

  const { levels, url, fields: datasetFields } = chartData!;

  const boundaryProps = levels.reduce(
    (obj, item) => ({
      ...obj,
      [item.id]: {
        code: properties[item.id],
        level: item.level,
        name: properties[item.name],
      },
    }),
    {},
  );

  const adminBoundaryParams: AdminBoundaryParams = {
    boundaryProps,
    serverLayerName,
    url,
    datasetFields,
    id: getLowestLevelBoundaryId(levels),
  };

  return adminBoundaryParams;
};
