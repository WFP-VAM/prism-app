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
        `linear-gradient(
          to ${fillPattern} bottom, 
          ${color} calc(100% / 7),  
          white calc(100% / 7) calc(100% / 7 * 2), 
          ${color} calc(100% / 7 * 2) calc(100% / 7 * 3), 
          white calc(100% / 7 * 3) calc(100% / 7 * 4), 
          ${color} calc(100% / 7 * 4) calc(100% / 7 * 5),
          white calc(100% / 7 * 5) calc(100% / 7 * 6), 
          ${color} calc(100% / 7 * 6)
        )`,
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
