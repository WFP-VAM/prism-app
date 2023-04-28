import { Box } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { Extent } from '../../Layers/raster-utils';
import MenuItem from './MenuItem';
import { MenuItemType } from '../../../../config/types';

const LayersPanel = memo(({ extent, layersMenuItems }: LayersPanelProps) => {
  const renderedRootAccordionItems = useMemo(() => {
    return layersMenuItems.map((menuItem: MenuItemType) => {
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
  }, [extent, layersMenuItems]);

  return <Box>{renderedRootAccordionItems}</Box>;
});

interface LayersPanelProps {
  extent?: Extent;
  layersMenuItems: MenuItemType[];
}

export default LayersPanel;
