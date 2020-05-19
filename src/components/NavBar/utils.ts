import { chain, map, startCase } from 'lodash';

import appJSON from '../../config/prism.json';
import { LayerDefinitions } from '../../config/utils';
import {
  LayersCategoryType,
  LayerType,
  MenuItemType,
} from '../../config/types';

import baseline from '../images/icon_basemap.png';
import climate from '../images/icon_climate.png';
import impact from '../images/icon_impact.png';

const icons: { [key: string]: string } = {
  baseline,
  climate,
  impact,
};

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(layersList: {
  [key: string]: string[];
}): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => ({
    title: startCase(layersListKey),
    layers: layerKeys
      .map(key => LayerDefinitions.get(key))
      .filter((val): val is LayerType => Boolean(val)),
  }));
}

export const menuList: MenuItemsType = chain(appJSON)
  .get('categories')
  .map((layersCategories, categoryKey) => ({
    title: startCase(categoryKey),
    icon: icons[categoryKey],
    layersCategories: formatLayersCategories(layersCategories),
  }))
  .value();
