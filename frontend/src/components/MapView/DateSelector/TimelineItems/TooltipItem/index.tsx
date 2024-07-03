import { memo } from 'react';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';

const TooltipItem = memo(({ layerTitle, color, classes }: TooltipItemProps) => {
  return (
    <div className={classes.tooltipItemContainer}>
      <div
        className={classes.tooltipItemColor}
        style={{
          backgroundColor: color,
        }}
      />
      <div>{layerTitle}</div>
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
      marginRight: 3,
    },
  });

interface TooltipItemProps extends WithStyles<typeof styles> {
  layerTitle: string;
  color: string;
}

export default withStyles(styles)(TooltipItem);
