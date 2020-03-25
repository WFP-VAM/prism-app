import { chain, map, startCase, camelCase, mapKeys } from 'lodash';

import appJSON from '../../config/prism.json';
import layersJSON from '../../config/layers.json';
import baseline from '../images/icon_basemap.png';
import climate from '../images/icon_climate.png';
import impact from '../images/icon_impact.png';

const icons: { [key: string]: string } = {
  baseline,
  climate,
  impact,
};

export interface ILayer {
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

type TLayers = ILayer[];

export interface ICategory {
  title: string;
  icon: string;
  layersList: TLayers;
}
type TCategories = ICategory[];

function formatLayersList(layersList: { [key: string]: String[] }): TLayers {
  const formattedLayersList: any = map(
    layersList,
    (layersKey, layersListKey) => ({
      title: startCase(layersListKey),
      layers: chain(layersJSON)
        .pick(layersKey as any)
        .map((value, layerKey) => ({
          id: layerKey,
          ...mapKeys(value, (_value: string, key: string | undefined) =>
            camelCase(key),
          ),
        }))
        .value(),
    }),
  );
  return formattedLayersList as TLayers;
}

export const categories: TCategories = chain(appJSON)
  .get('categories')
  .map((layersList, categoryKey) => {
    return {
      title: startCase(categoryKey),
      icon: icons[categoryKey],
      layersList: formatLayersList(layersList),
    };
  })
  .value();
