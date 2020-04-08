import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button,
  Typography,
  Popover,
  withStyles,
  WithStyles,
  createStyles,
  Theme,
  Switch,
} from '@material-ui/core';

import { MenuItemType, LayerType } from '../../../config/types';
import {
  layersSelector,
  addLayer,
  removeLayer,
} from '../../../context/mapStateSlice';

function MenuItem({ classes, title, icon, layersCategories }: MenuItemProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const selectedLayers = useSelector(layersSelector);
  const dispatch = useDispatch();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const toggleLayerValue = (prevChecked: boolean, layer: LayerType) => {
    if (prevChecked) {
      dispatch(removeLayer(layer));
    } else {
      dispatch(addLayer(layer));
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'menu-item-popover' : undefined;

  return (
    <>
      <Button
        className={classes.title}
        onClick={handleClick}
        aria-describedby={id}
      >
        <img className={classes.icon} src={icon} alt={title} />
        <Typography variant="body2">{title}</Typography>
      </Button>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        className={classes.popover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          className: classes.paper,
        }}
      >
        {layersCategories.map(({ title: categoryTitle, layers }) => (
          <div key={categoryTitle} className={classes.categoryContainer}>
            <Typography variant="body2" className={classes.categoryTitle}>
              {categoryTitle}
            </Typography>
            <hr />

            {layers.map(layer => {
              const { id: layerId, title: layerTitle } = layer;
              const value = selectedLayers.has(layerId);
              return (
                <div key={layerId} className={classes.layersContainer}>
                  <Switch
                    size="small"
                    color="default"
                    checked={value}
                    onChange={() => toggleLayerValue(value, layer)}
                    inputProps={{ 'aria-label': layerTitle }}
                  />{' '}
                  <Typography variant="body1">{layerTitle}</Typography>
                </div>
              );
            })}
          </div>
        ))}
      </Popover>
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    title: {
      margin: '0px 14px',
      textTransform: 'uppercase',
      color: 'inherit',

      '&::after': {
        content: '""',
        display: 'inline-block',
        width: 0,
        height: 0,
        marginLeft: 3.5,
        verticalAlign: 3.5,
        borderTop: '3.5px solid',
        borderRight: '3.5px solid transparent',
        borderBottom: 0,
        borderLeft: '3.5px solid transparent',
      },
    },

    icon: {
      width: 18,
      marginRight: 6,
    },

    popover: {
      marginTop: 8,
    },

    paper: {
      padding: '8px 16px',
      backgroundColor: `${theme.palette.primary.main}f9`,
      borderRadius: theme.shape.borderRadius,
    },

    categoryContainer: {
      marginBottom: 16,
    },

    categoryTitle: {
      fontWeight: 'bold',
      textAlign: 'left',
    },

    layersContainer: {
      display: 'flex',
      marginBottom: 8,
    },
  });

export interface MenuItemProps
  extends MenuItemType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItem);
