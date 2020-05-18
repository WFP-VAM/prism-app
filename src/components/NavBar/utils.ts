import { chain, map, startCase, camelCase, mapKeys } from 'lodash';

import appJSON from '../../config/prism.json';
import layersJSON from '../../config/layers.json';
import tablesJSON from '../../config/tables.json';
import { LayersCategoryType, MenuItemType } from '../../config/types';

import baseline from '../images/icon_basemap.png';
import climate from '../images/icon_climate.png';
import impact from '../images/icon_impact.png';
import tables from '../images/icon_table.png';

const icons: { [key: string]: string } = {
  baseline,
  climate,
  impact,
  tables,
};

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(layersList: {
  [key: string]: String[];
}): LayersCategoriesType {
  const formattedLayersCategories: any = map(
    layersList,
    (layersKey, layersListKey) => {
      return {
        title: startCase(layersListKey),
        layers: chain(layersJSON)
          .pick(layersKey as any)
          .map((value, layerKey) => {
            return {
              id: layerKey,
              ...mapKeys(value, (_value: string, key) => camelCase(key)),
            };
          })
          .value(),
        tables: chain(tablesJSON)
          .pick(layersKey as any)
          .map((value, tableKey) => {
            return {
              id: tableKey,
              ...mapKeys(value, (_value: string, key) => camelCase(key)),
            };
          })
          .value(),
      };
    },
  );
  return formattedLayersCategories as LayersCategoriesType;
}

export const menuList: MenuItemsType = chain(appJSON)
  .get('categories')
  .map((layersCategories, categoryKey) => {
    return {
      title: startCase(categoryKey),
      icon: icons[categoryKey],
      layersCategories: formatLayersCategories(layersCategories),
    };
  })
  .value();
