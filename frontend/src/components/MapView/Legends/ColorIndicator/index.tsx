import { Typography } from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { alpha } from '@mui/material/styles';

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
      flexShrink: 0,
    },
  }),
);

const getShapeStyles = (
  iconShape: 'point' | 'square' | 'triangle' | 'diamond' | undefined,
  color: string,
  opacity: number,
) => {
  const baseColor = alpha(color, opacity);
  const size = 10;

  if (iconShape === 'triangle') {
    return {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid ${baseColor}`,
      borderRadius: 0,
    };
  }

  if (iconShape === 'diamond') {
    return {
      backgroundColor: baseColor,
      borderRadius: 0,
      transform: 'rotate(45deg)',
      width: size * 0.707, // sqrt(2) / 2 for 45deg rotation
      height: size * 0.707,
    };
  }

  if (iconShape === 'point') {
    return {
      backgroundColor: baseColor,
      borderRadius: '50%',
    };
  }
  // default to square
  return {
    backgroundColor: baseColor,
    borderRadius: 0,
  };
};

function ColorIndicator({
  value,
  color,
  opacity,
  fillPattern,
  iconShape,
}: ColorIndicatorProps) {
  const classes = useStyles();

  const shapeStyles = getShapeStyles(iconShape, color, opacity);

  return (
    <div className={classes.container}>
      <div
        className={classes.indicator}
        style={{
          ...shapeStyles,
          ...(fillPattern
            ? {
                backgroundColor: `linear-gradient(
          to ${fillPattern} bottom, 
          ${color} calc(100% / 7),  
          white calc(100% / 7) calc(100% / 7 * 2), 
          ${color} calc(100% / 7 * 2) calc(100% / 7 * 3), 
          white calc(100% / 7 * 3) calc(100% / 7 * 4), 
          ${color} calc(100% / 7 * 4) calc(100% / 7 * 5),
          white calc(100% / 7 * 5) calc(100% / 7 * 6), 
          ${color} calc(100% / 7 * 6)
        )`,
              }
            : {}),
        }}
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
  iconShape?: 'point' | 'square' | 'triangle' | 'diamond';
}

export default ColorIndicator;
