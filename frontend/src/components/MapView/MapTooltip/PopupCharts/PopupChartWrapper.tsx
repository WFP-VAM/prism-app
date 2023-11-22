import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  IconButton,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React, { ReactNode, memo } from 'react';

const styles = () =>
  createStyles({
    closeButton: {
      color: 'white',
      position: 'absolute',
      right: 0,
      top: 0,
    },
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
  onClose: React.Dispatch<React.SetStateAction<any>>;
}

const PopupChartWrapper = ({
  onClose,
  children,
  classes,
}: PopupChartWrapperProps) => (
  <div className={classes.chartsContainer}>
    <IconButton
      aria-label="close"
      className={classes.closeButton}
      onClick={() => onClose(undefined)}
      size="small"
    >
      <FontAwesomeIcon icon={faTimes} />
    </IconButton>
    <div className={classes.charts}>{children}</div>
  </div>
);

export default memo(withStyles(styles)(PopupChartWrapper));
