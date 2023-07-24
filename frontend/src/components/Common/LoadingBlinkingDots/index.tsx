import React, { memo } from 'react';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';

const LoadingBlinkingDots = memo(({ classes }: LoadingBlinkingDotsProps) => {
  return (
    <>
      <span className={classes.dot}>.</span>
      <span className={classes.dot}>.</span>
      <span className={classes.dot}>.</span>
    </>
  );
});

const styles = () =>
  createStyles({
    '@keyframes blink': {
      '50%': {
        color: 'transparent',
      },
    },
    dot: {
      color: 'black',
      animation: '1s $blink infinite',
      '&:nth-child(2)': {
        animationDelay: '250ms',
      },
      '&:nth-child(3)': {
        animationDelay: '500ms',
      },
    },
  });

export interface LoadingBlinkingDotsProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(LoadingBlinkingDots);
