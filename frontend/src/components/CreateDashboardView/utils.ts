import { appConfig } from 'config';
import { AggregationOperations } from 'config/aggregationOperations';
import {
  ChartHeight,
  Dashboard,
  DashboardElements,
  DashboardElementType,
  DashboardMapPosition,
} from 'config/types';
import { generateSlugFromTitle } from 'utils/string-utils';

export type DashboardPreset = 'map-left' | 'map-right' | 'two-maps';

export interface SlotConfig {
  type: DashboardElementType | null;
}

export const MAX_SIDEBAR_SLOTS = 3;

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
      };
    case DashboardElementType.TEXT:
      return { type: DashboardElementType.TEXT, content: '' };
    case DashboardElementType.CHART:
      return {
        type: DashboardElementType.CHART,
        startDate: '',
        layerId: '',
        chartHeight: ChartHeight.TALL,
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
      };
    default:
      return { type: DashboardElementType.TEXT, content: '' };
  }
};

export interface DraftMeta {
  id: string;
  title: string;
  path: string;
}

export const buildDraftDashboard = (
  preset: DashboardPreset,
  sidebarSlots: SlotConfig[],
  meta: DraftMeta,
): Dashboard => {
  const mapElement = defaultElementForType(DashboardElementType.MAP);
  const sidebarElements = sidebarSlots
    .filter(s => s.type !== null)
    .map(s => defaultElementForType(s.type!));

  const base = { ...meta };

  switch (preset) {
    case 'map-left':
      return {
        ...base,
        firstColumn: [mapElement],
        secondColumn: sidebarElements,
      };
    case 'map-right':
      return {
        ...base,
        firstColumn: sidebarElements,
        secondColumn: [mapElement],
      };
    case 'two-maps':
      return {
        ...base,
        firstColumn: [mapElement],
        secondColumn: [defaultElementForType(DashboardElementType.MAP)],
      };
  }
};

export const buildDraftMeta = (existingDraftCount: number): DraftMeta => {
  const n = existingDraftCount + 1;
  const title = n === 1 ? 'New Dashboard' : `New Dashboard #${n}`;
  const id = crypto.randomUUID();
  return { id, title, path: generateSlugFromTitle(title) };
};
