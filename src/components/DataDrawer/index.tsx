import React from 'react';
import { useSelector } from 'react-redux';
import {
  Theme,
  withStyles,
  WithStyles,
  createStyles,
  Drawer,
} from '@material-ui/core';
import DataTable from './DataTable';
import { getIsShowing } from '../../context/tableStateSlice';

function DataDrawer({ classes }: DataDrawerProps) {
  const tableIsShowing = useSelector(getIsShowing);

  return (
    <Drawer anchor="left" open={tableIsShowing}>
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
      height: '100vh',
    },
  });

export interface DataDrawerProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(DataDrawer);
