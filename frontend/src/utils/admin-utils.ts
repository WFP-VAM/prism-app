import { appConfig } from 'config';
import {
  AdminLevelType,
  DatasetLevel,
  BoundaryLayerProps,
  WMSLayerProps,
} from 'config/types';
import {
  getBoundaryLayerSingleton,
  getBoundaryLayersByAdminLevel,
  getDisplayBoundaryLayers,
} from 'config/utils';
import { AdminBoundaryParams } from 'context/datasetStateSlice';
import { CHART_API_URL } from 'utils/constants';

const { multiCountry } = appConfig;
const MAX_ADMIN_LEVEL = multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

export function getAdminLevelLayer(
  adminLevel: AdminLevelType = 1,
): BoundaryLayerProps {
  const boundaryLayers = getDisplayBoundaryLayers();
  return (
    boundaryLayers.find(layer => layer.adminLevelNames.length === adminLevel) ||
    boundaryLayers[0]
  );
}

export function getAdminNameProperty(adminLevel: AdminLevelType = 1): string {
  const { adminLevelNames } = getBoundaryLayerSingleton();
  return adminLevelNames[adminLevel - 1];
}

export function getLowestAdminLevelName(): string {
  const { adminLevelNames } = getBoundaryLayerSingleton();
  return adminLevelNames[adminLevelNames.length - 1];
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
  const locationLevelNames = boundaryLayer.adminLevelLocalNames;

  const { levels, url: chartUrl, fields: datasetFields } = chartData!;

  // Take in chart url if provided, otherwise use default CHART_API_URL
  const url = chartUrl || CHART_API_URL;

  // TODO - why not reduce this by level directly?
  const boundaryProps = levels.reduce(
    (obj, item) => ({
      ...obj,
      [item.id]: {
        code: properties[item.id],
        level: item.level,
        name: properties[item.name],
        localName:
          properties[
            locationLevelNames[Number(item.level) - (multiCountry ? 0 : 1)]
          ],
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
