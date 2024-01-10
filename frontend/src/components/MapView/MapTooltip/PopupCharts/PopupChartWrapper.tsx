import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { ReactNode, memo } from 'react';

const styles = () =>
  createStyles({
    chartsContainer: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    charts: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
  });

interface PopupChartWrapperProps extends WithStyles<typeof styles> {
  children: ReactNode;
}

const PopupChartWrapper = ({ children, classes }: PopupChartWrapperProps) => (
  <div className={classes.chartsContainer}>
    <div className={classes.charts}>{children}</div>
  </div>
);

export default memo(withStyles(styles)(PopupChartWrapper));
