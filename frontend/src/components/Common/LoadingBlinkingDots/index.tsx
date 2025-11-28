import { memo } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
;

const LoadingBlinkingDots = memo(({ dotColor }: LoadingBlinkingDotsProps) => {
  const classes = useStyles();
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
});

const useStyles = makeStyles(() =>
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
  }),
);

export interface LoadingBlinkingDotsProps {
  dotColor?: string;
}

export default LoadingBlinkingDots;
