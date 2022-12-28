import { Box } from '@material-ui/core';
import React from 'react';
import MenuItem from './MenuItem';
import { menuList } from './utils';

const menu = menuList.map(({ title, ...category }) => (
  <MenuItem key={title} title={title} {...category} />
));

function LayersPanel() {
  return <Box>{menu}</Box>;
}

export default LayersPanel;
