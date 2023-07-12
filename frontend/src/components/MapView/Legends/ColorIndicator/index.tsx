import React from 'react';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { alpha } from '@material-ui/core/styles';

interface StylesProps {
  color: string;
  opacity: number;
  fillPattern: 'left' | 'right' | undefined;
}

const indicatorsCommonStyles = {
  height: 10,
  width: 10,
  marginRight: 4,
};

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
    },
    indicator: {
      ...indicatorsCommonStyles,
      backgroundColor: ({ color, opacity }: StylesProps) =>
        alpha(color, opacity),
    },
    fillPatternIndicator: {
      ...indicatorsCommonStyles,
      background: ({ color, fillPattern }: StylesProps) =>
        `repeating-linear-gradient(to ${fillPattern} bottom, ${color}, ${color} 2px, white 2px, white 4px)`,
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
