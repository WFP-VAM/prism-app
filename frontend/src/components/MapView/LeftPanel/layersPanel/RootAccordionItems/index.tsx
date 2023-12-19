import { LayersCategoryType, MenuItemType } from 'config/types';
import React, { memo } from 'react';
import useLayers from 'utils/layers-utils';
import MenuItem from '../MenuItem';
import { menuList } from '../../utils';

const RootAccordionItems = () => {
  const { adminBoundariesExtent: extent } = useLayers();

  const layersMenuItems = menuList.filter((menuItem: MenuItemType) => {
    return menuItem.layersCategories.some(
      (layerCategory: LayersCategoryType) => {
        return layerCategory.layers.length > 0;
      },
    );
  });

  return (
    <>
      {layersMenuItems.map((menuItem: MenuItemType) => {
        return (
          <MenuItem
            key={menuItem.title}
            title={menuItem.title}
            layersCategories={menuItem.layersCategories}
            icon={menuItem.icon}
            extent={extent}
          />
        );
      })}
    </>
  );
};

export default memo(RootAccordionItems);
