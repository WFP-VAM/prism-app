import { camelCase, get, map, mapKeys, startCase } from 'lodash';

import {
  isTableKey,
  LayerDefinitions,
  TableDefinitions,
  TableKey,
} from 'config/utils';
import {
  isLayerKey,
  LayerKey,
  LayersCategoryType,
  MenuGroup,
  MenuItemType,
} from 'config/types';
import { appConfig } from 'config';

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(layersList: {
  [key: string]: Array<LayerKey | TableKey>;
}): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => {
    return {
      title: startCase(layersListKey),
      layers: layerKeys.filter(isLayerKey).map(key => {
        if (typeof key === 'object') {
          const group = (mapKeys(key, (_v, k: string) =>
            camelCase(k),
          ) as unknown) as MenuGroup;
          const mainLayer = group.layers.find(l => l.main);
          const layer = LayerDefinitions[mainLayer?.id as LayerKey];
          // eslint-disable-next-line fp/no-mutation
          layer.group = group;
          return layer;
        }
        return LayerDefinitions[key as LayerKey];
      }),
      tables: layerKeys.filter(isTableKey).map(key => TableDefinitions[key]),
    };
  });
}

/**
 * Returns true if every layer/table key in every layer category given actually exists.
 * Returns false otherwise.
 * @param layersCategories a dictionary of layer categories from appJSON.categories
 */
function checkLayersCategories(
  layersCategories: Record<string, any>,
): layersCategories is Record<string, Array<LayerKey | TableKey>> {
  return Object.values(layersCategories)
    .flat()
    .every(layerOrTableKey => {
      if (isLayerKey(layerOrTableKey) || isTableKey(layerOrTableKey)) {
        return true;
      }
      console.error(`Key ${layerOrTableKey} isn't a valid layer or table key`);
      return false;
    });
}

export const menuList: MenuItemsType = map(
  appConfig.categories,
  (layersCategories, categoryKey) => {
    if (!checkLayersCategories(layersCategories)) {
      throw new Error(
        `'${categoryKey}' in prism.json isn't a valid category. Check console for more details.`,
      );
    }
    return {
      title: startCase(categoryKey),
      icon: get(appConfig, `icons.${categoryKey}`, 'icon_vulnerable.png'),
      layersCategories: formatLayersCategories(layersCategories),
    };
  },
);

export const tablesMenuItems = menuList.filter((menuItem: MenuItemType) => {
  return menuItem.layersCategories.some((layerCategory: LayersCategoryType) => {
    return layerCategory.tables.length > 0;
  });
});

export const areTablesAvailable = tablesMenuItems.length >= 1;
export const isAnticipatoryActionAvailable = !!appConfig.anticipatory_action_url;

export const oneDayInMs = 24 * 60 * 60 * 1000;
export const oneYearInMs = 365 * oneDayInMs;
