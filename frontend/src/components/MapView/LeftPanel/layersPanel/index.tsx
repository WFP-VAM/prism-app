import { Box } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { Extent } from '../../Layers/raster-utils';
import MenuItem from './MenuItem';
import { menuList } from './utils';
import { MenuItemType } from '../../../../config/types';

const LayersPanel = memo(({ extent }: LayersPanelProps) => {
  const renderedRootAccordionItems = useMemo(() => {
    return menuList.map((menuItem: MenuItemType) => {
      return (
        <MenuItem
          key={menuItem.title}
          title={menuItem.title}
          layersCategories={menuItem.layersCategories}
          icon={menuItem.icon}
          extent={extent}
        />
      );
    });
  }, [extent]);

  return <Box>{renderedRootAccordionItems}</Box>;
});

interface LayersPanelProps {
  extent?: Extent;
}

export default LayersPanel;
