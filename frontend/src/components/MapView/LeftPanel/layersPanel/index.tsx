import { Box } from '@material-ui/core';
import React, { useMemo } from 'react';
import { Extent } from '../../Layers/raster-utils';
import MenuItem from './MenuItem';
import { menuList } from './utils';

function LayersPanel({ extent }: LayersPanelProps) {
  const menu = useMemo(
    () =>
      menuList.map(({ title, ...category }) => (
        <MenuItem key={title} title={title} {...category} extent={extent} />
      )),
    [extent],
  );

  return <Box>{menu}</Box>;
}

interface LayersPanelProps {
  extent?: Extent;
}

export default LayersPanel;
