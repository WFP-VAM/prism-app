import React, { useState } from 'react';
import {
  Button,
  createStyles,
  Grid,
  Hidden,
  MenuItem,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import Menu from '@material-ui/core/Menu';
import { ArrowDropDown } from '@material-ui/icons';
import { useSelector } from 'react-redux';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import { groupBoundaries } from '../utils';
import { LayerData } from '../../../context/layers/layer-data';
import { BoundaryLayerProps } from '../../../config/types';

const BoundarySelector = ({
  classes,
  boundaryLayerData,
}: BoundarySelectorProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const map = useSelector(mapSelector);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const bboxes = groupBoundaries(boundaryLayerData);

  return (
    <Grid item>
      <Button variant="contained" color="primary" onClick={handleClick}>
        <Hidden smDown>
          <Typography variant="body2">Go To</Typography>
        </Hidden>
        <ArrowDropDown fontSize="small" />
      </Button>
      <Menu
        id="boundaries-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {bboxes.map(item => (
          <MenuItem
            className={item.parent === true ? classes.parent : classes.child}
            onClick={() =>
              map && map.fitBounds(item.bbox, { padding: 15, animate: true })
            }
          >
            {item.name}
          </MenuItem>
        ))}
      </Menu>
    </Grid>
  );
};

const styles = (theme: Theme) =>
  createStyles({
    parent: {
      textTransform: 'uppercase',
      fontWeight: 'bold',
      color: theme.palette.primary.main,
      fontSize: '13px',
    },
    child: {
      color: theme.palette.primary.main,
      fontSize: '13px',
    },
  });

export interface BoundarySelectorProps extends WithStyles<typeof styles> {
  boundaryLayerData?: LayerData<BoundaryLayerProps>;
}

export default withStyles(styles)(BoundarySelector);
