import { filter, flattenDeep, get, map, startCase, values } from 'lodash';

import { appConfig } from '../../config';
import {
  isTableKey,
  LayerDefinitions,
  TableDefinitions,
  TableKey,
} from '../../config/utils';
import {
  isLayerKey,
  LayerKey,
  LayersCategoryType,
  MenuGroup,
  MenuItemType,
} from '../../config/types';

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

type MenuGroupType = MenuGroup[];

function formatLayersCategories(layersList: {
  [key: string]: Array<LayerKey | TableKey>;
}): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => {
    return {
      title: startCase(layersListKey),
      layers: layerKeys.filter(isLayerKey).map(key => {
        if (typeof key === 'object') {
          const { title, layers } = key as MenuGroup;
          // use first layer in group as default
          const layer = LayerDefinitions[layers[0].id as LayerKey];
          // eslint-disable-next-line fp/no-mutation
          layer.menuGroup = layers;
          // eslint-disable-next-line fp/no-mutation
          layer.menuGroupTitle = title;
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

export const menuGroup: MenuGroupType = map(
  filter(
    flattenDeep(
      map(appConfig.categories, layersCategories => values(layersCategories)),
    ),
    layer => typeof layer === 'object',
  ),
  layerGroup => {
    return layerGroup || { title: '', optionTitle: '', layers: [] };
  },
);
