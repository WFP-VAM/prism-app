import { LayersCategoryType, MenuItemType } from 'config/types';
import { memo, useMemo } from 'react';
import useLayers from 'utils/layers-utils';
import { useMapState } from 'utils/useMapState';
import MenuItem from '../MenuItem';
import { getDynamicMenuList } from '../../utils';

const RootAccordionItems = memo(() => {
  const { adminBoundariesExtent: extent } = useLayers();
  const mapState = useMapState();
  const selectedLayers = mapState.layers;

  const menuList = useMemo(
    () => getDynamicMenuList(selectedLayers),
    [selectedLayers],
  );

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
          // icon={menuItem.icon}
          extent={extent}
        />
      ))}
    </>
  );
});

export default RootAccordionItems;
