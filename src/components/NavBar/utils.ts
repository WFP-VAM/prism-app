import { chain, map, startCase } from 'lodash';

import appJSON from '../../config/prism.json';
import { LayerDefinitions, TableDefinitions } from '../../config/utils';
import {
  LayersCategoryType,
  LayerType,
  MenuItemType,
} from '../../config/types';

import vulnerability from '../images/icon_vulnerable.png';
import exposure from '../images/icon_basemap.png';
import hazards from '../images/icon_climate.png';
import risk from '../images/icon_impact.png';
// note to Ovio: wanted to use risk_and_impact but this fails. riskandimpact works, but doesn't create spaces in nav
import capacity from '../images/icon_capacity.png';
import tables from '../images/icon_table.png';

const icons: { [key: string]: string } = {
  vulnerability,
  exposure,
  hazards,
  risk,
  capacity,
  tables,
};

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(layersList: {
  [key: string]: string[];
}): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => ({
    title: startCase(layersListKey),
    layers: layerKeys
      .map(key => LayerDefinitions[key])
      .filter((val): val is LayerType => Boolean(val)),

    tables: layerKeys
      .map(key => TableDefinitions[key])
      .filter(val => Boolean(val)),
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
