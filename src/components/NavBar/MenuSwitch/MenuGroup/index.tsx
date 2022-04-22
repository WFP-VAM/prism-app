import React, { useState } from 'react';
import {
  createStyles,
  MenuItem,
  Select,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import {
  LayerKey,
  LayerType,
  LayerMenuGroupItem,
} from '../../../../config/types';
import { LayerDefinitions } from '../../../../config/utils';

function MenuGroup({ classes, menuGroup, toggleLayerValue }: MenuGroupProps) {
  const [activeLayer, setActiveLayer] = useState(menuGroup[0].id);

  const handleChange = (
    event: React.ChangeEvent<{ value: string | unknown }>,
  ) => {
    const layerId = event.target.value;
    const layer = LayerDefinitions[layerId as LayerKey];
    toggleLayerValue(layer, true);
    setActiveLayer(layerId as string);
  };

  return (
    <Select
      className={classes.select}
      classes={{ root: classes.selectItem }}
      value={activeLayer}
      onChange={e => handleChange(e)}
    >
      {menuGroup.map(menu => (
        <MenuItem key={menu.id} value={menu.id}>
          {menu.label}
        </MenuItem>
      ))}
    </Select>
  );
}

const styles = () =>
  createStyles({
    select: {
      '&::before': {
        border: 'none',
      },
    },
    selectItem: {
      whiteSpace: 'normal',
      fontSize: 13,
      fontWeight: 300,
      padding: 0,
      marginLeft: 5,
    },
  });

export interface MenuGroupProps extends WithStyles<typeof styles> {
  menuGroup: LayerMenuGroupItem[];
  toggleLayerValue: (layer: LayerType, checked: boolean) => void;
}

export default withStyles(styles)(MenuGroup);
