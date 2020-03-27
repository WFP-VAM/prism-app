import { chain, map, startCase, camelCase, mapKeys } from 'lodash';

import appJSON from '../../config/prism.json';
import layersJSON from '../../config/layers.json';
import { LayerType, CategoryType } from '../../config/types';

import baseline from '../images/icon_basemap.png';
import climate from '../images/icon_climate.png';
import impact from '../images/icon_impact.png';

const icons: { [key: string]: string } = {
  baseline,
  climate,
  impact,
};

type LayersType = LayerType[];

type CategoriesType = CategoryType[];

function formatLayersList(layersList: { [key: string]: String[] }): LayersType {
  const formattedLayersList: any = map(
    layersList,
    (layersKey, layersListKey) => ({
      title: startCase(layersListKey),
      layers: chain(layersJSON)
        .pick(layersKey as any)
        .map((value, layerKey) => ({
          id: layerKey,
          ...mapKeys(value, (_value: string, key) => camelCase(key)),
        }))
        .value(),
    }),
  );
  return formattedLayersList as LayersType;
}

export const categories: CategoriesType = chain(appJSON)
  .get('categories')
  .map((layersList, categoryKey) => ({
    title: startCase(categoryKey),
    icon: icons[categoryKey],
    layersList: formatLayersList(layersList),
  }))
  .value();
