import { LayersCategoryType, MenuItemType } from 'config/types';
import { memo } from 'react';
import useLayers from 'utils/layers-utils';
import MenuItem from '../MenuItem';
import { menuList } from '../../utils';

function RootAccordionItems() {
  const { adminBoundariesExtent: extent } = useLayers();

  const layersMenuItems = menuList.filter((menuItem: MenuItemType) =>
    menuItem.layersCategories.some(
      (layerCategory: LayersCategoryType) => layerCategory.layers.length > 0,
    ),
  );

  return (
    <>
      {layersMenuItems.map((menuItem: MenuItemType) => (
        <MenuItem
          key={menuItem.title}
          title={menuItem.title}
          layersCategories={menuItem.layersCategories}
          icon={menuItem.icon}
          extent={extent}
        />
      ))}
    </>
  );
}

export default memo(RootAccordionItems);
