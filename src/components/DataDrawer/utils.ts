import { chain, map, startCase, camelCase, mapKeys } from 'lodash';

import appJSON from '../../config/prism.json';
import layersJSON from '../../config/layers.json';
import tablesJSON from '../../config/tables.json';
import { LayersCategoryType, MenuItemType } from '../../config/types';

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
          .map((value, layerKey) => {
            return {
              id: layerKey,
              ...mapKeys(value, (_value: string, key) => camelCase(key)),
            };
          })
          .value(),
      };
    },
  );
  return formattedLayersCategories as LayersCategoriesType;
}
