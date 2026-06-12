import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { memo, ReactNode } from 'react';

const useStyles = makeStyles(() =>
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
  }),
);

interface PopupChartWrapperProps {
  children: ReactNode;
}

const PopupChartWrapper = memo(({ children }: PopupChartWrapperProps) => {
  const classes = useStyles();

  return (
    <div className={classes.chartsContainer}>
      <div className={classes.charts}>{children}</div>
    </div>
  );
});

export default PopupChartWrapper;
