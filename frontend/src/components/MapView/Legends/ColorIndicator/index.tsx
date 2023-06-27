import React from 'react';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { fade } from '@material-ui/core/styles/colorManipulator';

interface StylesProps {
  color: string;
  opacity: number;
  fillPattern: 'left' | 'right' | undefined;
}

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
    },
    indicator: {
      height: 20,
      width: 20,
      marginRight: 4,
      backgroundColor: ({ color, opacity }: StylesProps) =>
        fade(color, opacity),
    },
    fillPatternIndicator: {
      height: 20,
      width: 20,
      marginRight: 4,
      background: ({ color, fillPattern }: StylesProps) =>
        `repeating-linear-gradient(to ${fillPattern} bottom, transparent, ${color} 4px)`,
    },
  }),
);

function ColorIndicator({
  value,
  color,
  opacity,
  fillPattern,
}: ColorIndicatorProps) {
  const classes = useStyles({ color, opacity, fillPattern });

  return (
    <div className={classes.container}>
      <div
        className={
          fillPattern ? classes.fillPatternIndicator : classes.indicator
        }
      />
      <Typography color="textSecondary">{value}</Typography>
    </div>
  );
}

export interface ColorIndicatorProps {
  value: string;
  color: string;
  opacity: number;
  fillPattern?: 'left' | 'right';
}

export default ColorIndicator;
