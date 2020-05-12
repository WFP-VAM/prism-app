import { chain, map, startCase, camelCase, mapKeys } from 'lodash';

import appJSON from '../../config/prism.json';
import layersJSON from '../../config/layers.json';
import { LayersCategoryType, MenuItemType } from '../../config/types';

import baseline from '../images/icon_basemap.png';
import climate from '../images/icon_climate.png';
import impact from '../images/icon_impact.png';

const icons: { [key: string]: string } = {
  baseline,
  climate,
  impact,
  // TODO - Update table icon
  tables: impact,
};

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(layersList: {
  [key: string]: String[];
}): LayersCategoriesType {
  const formattedLayersCategories: any = map(
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
  return formattedLayersCategories as LayersCategoriesType;
}

export const menuList: MenuItemsType = chain(appJSON)
  .get('categories')
  .map((layersCategories, categoryKey) => ({
    title: startCase(categoryKey),
    icon: icons[categoryKey],
    layersCategories: formatLayersCategories(layersCategories),
  }))
  .value();
