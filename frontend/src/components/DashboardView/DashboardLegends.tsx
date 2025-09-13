import { createStyles, makeStyles } from '@material-ui/core';
import { memo } from 'react';
import LegendItemsList from '../MapView/Legends/LegendItemsList';

const DashboardLegends = memo(() => {
  const classes = useStyles();

  return (
    <aside className={classes.container}>
      <LegendItemsList listStyle={classes.list} />
    </aside>
  );
});

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      position: 'absolute',
      top: '8px',
      right: '24px',
    },
    list: {
      maxHeight: '300px',
      overflowY: 'auto',
    },
  }),
);

export default DashboardLegends;
