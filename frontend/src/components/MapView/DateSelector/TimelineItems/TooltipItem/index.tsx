import { memo } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
;

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
