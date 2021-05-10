import React from 'react';
import { createStyles, makeStyles, Typography } from '@material-ui/core';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
    },
    indicator: {
      height: 10,
      width: 10,
      marginRight: 4,
      backgroundColor: ({ color }: any) => color,
    },
  }),
);

function ColorIndicator({ value, color }: ColorIndicatorProps) {
  const classes = useStyles({ color });

  return (
    <div className={classes.container}>
      <div className={classes.indicator} />
      <Typography color="textSecondary">{value}</Typography>
    </div>
  );
}

export interface ColorIndicatorProps {
  value: string;
  color: string;
}

export default ColorIndicator;
