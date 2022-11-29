import React from 'react';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { alpha } from '@material-ui/core/styles';

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
      backgroundColor: ({
        color,
        opacity,
      }: {
        color: string;
        opacity: number;
      }) => alpha(color, opacity),
    },
  }),
);

function ColorIndicator({ value, color, opacity }: ColorIndicatorProps) {
  const classes = useStyles({ color, opacity });
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
  opacity: number;
}

export default ColorIndicator;
