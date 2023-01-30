import { Box } from '@material-ui/core';
import React from 'react';
import { useSelector } from 'react-redux';
import { leftPanelTabValueSelector } from '../../../../context/leftPanelStateSlice';
import { Extent } from '../../Layers/raster-utils';
import MenuItem from './MenuItem';
import { menuList } from './utils';

const tabIndex = 0;

function LayersPanel({ extent }: LayersPanelProps) {
  const tabValue = useSelector(leftPanelTabValueSelector);

  return (
    <Box>
      {menuList.map(({ title, ...category }) => (
        <MenuItem
          key={title}
          title={title}
          {...category}
          extent={extent}
          shouldRender={tabIndex === tabValue}
        />
      ))}
    </Box>
  );
}

interface LayersPanelProps {
  extent?: Extent;
}

export default LayersPanel;
