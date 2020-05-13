import { Map, List } from 'immutable';

export interface LayerType {
  id: string;
  title: string;
  serverType: string;
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

export interface TableType {
  id: string;
  title: string;
  table: string;
  legendText: string;
}

export interface LayersMap extends Map<string, LayerType> {}

export interface LayersCategoryType {
  title: string;
  layers: LayerType[];
  tables?: TableType[];
}

export interface MenuItemType {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
}

export interface AvailableDates extends Map<string, List<number>> {}
