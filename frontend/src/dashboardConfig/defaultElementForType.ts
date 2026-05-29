import { appConfig } from 'config';
import { AggregationOperations } from 'config/aggregationOperations';
import {
  ChartHeight,
  ChartLatestPeriod,
  ChartPeriodReference,
  DashboardElements,
  DashboardElementType,
  DashboardMapPosition,
} from 'config/types';

const today = () => new Date().toISOString().slice(0, 10);

export const defaultElementForType = (
  type: DashboardElementType,
): DashboardElements => {
  switch (type) {
    case DashboardElementType.MAP:
      return {
        type: DashboardElementType.MAP,
        preSelectedMapLayers: [],
        legendVisible: true,
        legendPosition: DashboardMapPosition.right,
        minMapBounds: appConfig.map.boundingBox,
        useLatestAvailableDate: false,
      };
    case DashboardElementType.TEXT:
      return { type: DashboardElementType.TEXT, content: '' };
    case DashboardElementType.CHART:
      return {
        type: DashboardElementType.CHART,
        startDate: '',
        layerId: '',
        chartHeight: ChartHeight.TALL,
        useLatestAvailableDate: false,
        latestPeriod: ChartLatestPeriod.MONTH,
        periodReference: ChartPeriodReference.CURRENT,
      };
    case DashboardElementType.TABLE:
      return {
        type: DashboardElementType.TABLE,
        startDate: today(),
        hazardLayerId: '',
        baselineLayerId: '',
        stat: AggregationOperations.Mean,
        maxRows: 10,
        addResultToMap: true,
        sortColumn: 'name',
        sortOrder: 'asc',
        useLatestAvailableDate: false,
      };
    default:
      return { type: DashboardElementType.TEXT, content: '' };
  }
};
