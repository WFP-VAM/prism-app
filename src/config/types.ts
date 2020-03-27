export interface LayerType {
  title: string;
  layers: {
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
  }[];
}

export interface CategoryType {
  title: string;
  icon: string;
  layersList: LayerType[];
}
