import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Theme,
  withStyles,
  WithStyles,
  createStyles,
  Drawer,
} from '@material-ui/core';
import DataTable from './DataTable';
import {
  isDataTableDrawerActiveSelector,
  hideDataTableDrawer,
} from '../../context/analysisResultStateSlice';

function AnalysisDataDrawer({ classes }: DataDrawerProps) {
  const tableIsShowing = useSelector(isDataTableDrawerActiveSelector);
  const dispatch = useDispatch();
  const handleClose = () => {
    dispatch(hideDataTableDrawer());
  };

  return (
    <Drawer anchor="left" open={tableIsShowing} onClose={handleClose}>
      <div className={classes.drawerContent}>
        <DataTable maxResults={1000} />
      </div>
    </Drawer>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    drawerContent: {
      backgroundColor: theme.palette.primary.main,
      padding: 16,
      width: '40vw',
    },
  });

export interface DataDrawerProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AnalysisDataDrawer);
