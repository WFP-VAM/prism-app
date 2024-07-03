import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import { ReactNode, memo } from 'react';

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

function PopupChartWrapper({ children, classes }: PopupChartWrapperProps) {
  return (
    <div className={classes.chartsContainer}>
      <div className={classes.charts}>{children}</div>
    </div>
  );
}

export default memo(withStyles(styles)(PopupChartWrapper));
