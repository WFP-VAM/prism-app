import React, { memo } from 'react';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';

const TooltipItem = memo(({ layerTitle, color, classes }: TooltipItemProps) => {
  return (
    <div className={classes.tooltipItemContainer}>
      <div>{layerTitle}</div>
      <div
        className={classes.tooltipItemColor}
        style={{
          backgroundColor: color,
        }}
      />
    </div>
  );
});

const styles = () =>
  createStyles({
    tooltipItemContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    tooltipItemColor: {
      display: 'flex',
      width: 10,
      height: 10,
      marginLeft: 3,
    },
  });

interface TooltipItemProps extends WithStyles<typeof styles> {
  layerTitle: string;
  color: string;
}

export default withStyles(styles)(TooltipItem);
