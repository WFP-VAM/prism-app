import { map, startCase } from 'lodash';

import appJSON from '../../config/prism.json';
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
  [key: string]: Array<LayerKey | TableKey>;
}): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => {
    return {
      title: startCase(layersListKey),
      layers: layerKeys.filter(isLayerKey).map(key => LayerDefinitions[key]),
      tables: layerKeys.filter(isTableKey).map(key => TableDefinitions[key]),
    };
  });
}

export const menuList: MenuItemsType = map(
  appJSON.categories,
  (layersCategories, categoryKey) => {
    Object.values(layersCategories)
      .flat()
      .forEach(layerOrTableKey => {
        if (!isLayerKey(layerOrTableKey) && !isTableKey(layerOrTableKey)) {
          throw new Error(
            `Key ${layerOrTableKey} isn't valid layer or table in category: ${categoryKey} - prism.json`,
          );
        }
      });
    return {
      title: startCase(categoryKey),
      icon: icons[categoryKey],
      layersCategories: formatLayersCategories(
        // safe to cast - runtime checked above.
        layersCategories as {
          [key: string]: Array<LayerKey | TableKey>;
        },
      ),
    };
  },
);
