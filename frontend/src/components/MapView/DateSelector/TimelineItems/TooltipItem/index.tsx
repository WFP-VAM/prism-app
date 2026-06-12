import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { memo } from 'react';

const TooltipItem = memo(({ layerTitle, color }: TooltipItemProps) => {
  const classes = useStyles();
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

const useStyles = makeStyles(() =>
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
  }),
);

interface TooltipItemProps {
  layerTitle: string;
  color: string;
}

export default TooltipItem;
