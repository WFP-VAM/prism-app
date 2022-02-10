import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Grid,
  Button,
  Hidden,
  Typography,
  Theme,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import {
  toggleVisible,
  legendsVisibleSelector,
} from '../../../context/legendsStateSlice';

const LegendsVisibilityButton = ({ classes }: LegendsVisibilityButtonProps) => {
  const dispatch = useDispatch();
  const isVisible = useSelector(legendsVisibleSelector);

  return (
    <Grid item>
      <Button
        variant="contained"
        color="primary"
        onClick={() => dispatch(toggleVisible())}
      >
        {isVisible ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Legend
          </Typography>
        </Hidden>
      </Button>
    </Grid>
  );
};

const styles = (theme: Theme) =>
  createStyles({
    label: {
      marginLeft: '10px',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface LegendsVisibilityButtonProps
  extends WithStyles<typeof styles> {}

export default withStyles(styles)(LegendsVisibilityButton);
