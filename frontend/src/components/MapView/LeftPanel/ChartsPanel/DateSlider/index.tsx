import { Box, Typography, createStyles, makeStyles } from '@material-ui/core';
import React from 'react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

const useStyles = makeStyles(() =>
  createStyles({
    sliderContainer: {
      width: 'calc(100% - 4rem)',
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingTop: '1rem',
      paddingBottom: '2rem',
    },
    textLabel: {
      color: 'black',
    },
  }),
);

interface DateSliderProps {
  chartSelectedDateRange: [string, string];
  chartRange: [number, number];
  setChartRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  maxDataTicks: number;
  disabled: boolean;
}

function DateSlider({
  chartSelectedDateRange,
  chartRange,
  setChartRange,
  maxDataTicks,
  disabled,
}: DateSliderProps) {
  const classes = useStyles();

  return (
    <Box className={classes.sliderContainer}>
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Box display="flex" flexDirection="row">
          <Typography className={classes.textLabel} variant="body2">
            start:
          </Typography>{' '}
          <Typography className={classes.textLabel}>
            {chartSelectedDateRange[0]}
          </Typography>
        </Box>

        <Box display="flex" flexDirection="row">
          <Typography className={classes.textLabel} variant="body2">
            end:
          </Typography>{' '}
          <Typography className={classes.textLabel}>
            {chartSelectedDateRange[1]}
          </Typography>
        </Box>
      </Box>

      <RangeSlider
        value={chartRange}
        onInput={setChartRange}
        min={1}
        max={maxDataTicks}
        step={1}
        disabled={disabled}
      />
    </Box>
  );
}

export default DateSlider;
