import { Map, List } from 'immutable';

export type BoundaryKey = 'CODE' | 'CODE1' | 'CODE2';

export interface LayerType {
  id: string;
  title: string;
  type: string;
  data?: string;
  admin_code?: BoundaryKey;
  serverLayer?: string;
  serverUri?: string;
  hasDate: boolean;
  dateInterval?: string;
  opacity: number;
  path?: string;
  legend?: {
    value: string;
    color: string;
  }[];
  legendText: string;
}

export interface LayersMap extends Map<string, LayerType> {}

export interface LayersCategoryType {
  title: string;
  layers: LayerType[];
}

export interface MenuItemType {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
}

export interface AvailableDates extends Map<string, List<number>> {}
