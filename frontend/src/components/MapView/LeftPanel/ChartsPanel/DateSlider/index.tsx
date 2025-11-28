import {Box, Typography} from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import React from 'react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import './slider.css';
import { useSafeTranslation } from 'i18n';

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

  const { t } = useSafeTranslation();

  return (
    <Box className={classes.sliderContainer}>
      <Box
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingBottom: '0.5em',
        }}
      >
        <Box
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Typography className={classes.textLabel} variant="body2">
            {t('Start')}
          </Typography>
          {': '}
          <Typography className={classes.textLabel}>
            {chartSelectedDateRange[0]}
          </Typography>
        </Box>

        <Box
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Typography className={classes.textLabel} variant="body2">
            {t('End')}
          </Typography>
          {': '}
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
