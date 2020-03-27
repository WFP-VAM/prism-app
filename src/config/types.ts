export interface LayerType {
  id: string;
  title: string;
  serverType: string;
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

export interface LayersCategoryType {
  title: string;
  layers: LayerType[];
}

export interface MenuItemType {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
}
