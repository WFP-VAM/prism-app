import React from 'react';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { fade } from '@material-ui/core/styles/colorManipulator';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
    },
    indicator: {
      height: 15,
      width: 10,
      marginRight: 8,
      backgroundColor: ({
        color,
        opacity,
      }: {
        color: string;
        opacity: number;
      }) => fade(color, opacity),
    },
  }),
);

function ColorIndicator({ value, color, opacity }: ColorIndicatorProps) {
  const classes = useStyles({ color, opacity });
  return (
    <div className={classes.container}>
      <div className={classes.indicator} />
      <Typography color="textSecondary" variant="h5">
        {value}
      </Typography>
    </div>
  );
}

export interface ColorIndicatorProps {
  value: string;
  color: string;
  opacity: number;
}

export default ColorIndicator;
