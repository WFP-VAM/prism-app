import { Box } from '@material-ui/core';
import React from 'react';
import MenuItemMobile from './MenuItemMobile';
import { menuList } from './utils';

function LayersPanel() {
  const menuMobile = menuList.map(({ title, ...category }) => (
    <MenuItemMobile key={title} title={title} {...category} />
  ));
  return <Box>{menuMobile}</Box>;
}

export default LayersPanel;
