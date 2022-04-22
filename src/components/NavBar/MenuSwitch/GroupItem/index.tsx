import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  createStyles,
  MenuItem,
  Select,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { LayerKey, LayerType, MenuGroup } from '../../../../config/types';
import { LayerDefinitions } from '../../../../config/utils';
import { layersSelector } from '../../../../context/mapStateSlice/selectors';

function GroupItem({ classes, menuGroup, toggleLayerValue }: MenuGroupProps) {
  const selectedLayers = useSelector(layersSelector);
  const selected = selectedLayers.filter(layer => {
    return menuGroup.layers.map(menu => menu.id).includes(layer.id);
  });
  const [activeLayer, setActiveLayer] = useState(selected[0]?.id as string);

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
      {menuGroup.layers.map(menu => (
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
  menuGroup: MenuGroup;
  toggleLayerValue: (layer: LayerType, checked: boolean) => void;
}

export default withStyles(styles)(GroupItem);
