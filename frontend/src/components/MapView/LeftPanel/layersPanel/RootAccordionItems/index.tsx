import { LayersCategoryType, MenuItemType } from 'config/types';
import React, { memo } from 'react';
import { Extent } from 'components/MapView/Layers/raster-utils';
import MenuItem from '../MenuItem';
import { menuList } from '../../utils';

interface RootAccordionItemsProps {
  extent: Extent | undefined;
}
const RootAccordionItems = ({ extent }: RootAccordionItemsProps) => {
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
