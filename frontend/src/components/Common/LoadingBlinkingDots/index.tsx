import { memo } from 'react';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';

const LoadingBlinkingDots = memo(
  ({ classes, dotColor }: LoadingBlinkingDotsProps) => {
    const colorStyle = { color: dotColor || 'black' };
    return (
      <>
        &nbsp;
        <span className={classes.dot} style={colorStyle}>
          .
        </span>
        <span className={classes.dot} style={colorStyle}>
          .
        </span>
        <span className={classes.dot} style={colorStyle}>
          .
        </span>
      </>
    );
  },
);

const styles = () =>
  createStyles({
    '@keyframes blink': {
      '50%': {
        color: 'transparent',
      },
    },
    dot: {
      animation: '1s $blink infinite',
      '&:nth-child(2)': {
        animationDelay: '250ms',
      },
      '&:nth-child(3)': {
        animationDelay: '500ms',
      },
    },
  });

export interface LoadingBlinkingDotsProps extends WithStyles<typeof styles> {
  dotColor?: string;
}

export default withStyles(styles)(LoadingBlinkingDots);
