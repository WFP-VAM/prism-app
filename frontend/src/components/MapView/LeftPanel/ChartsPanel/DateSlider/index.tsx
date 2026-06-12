import 'react-range-slider-input/dist/style.css';
import './slider.css';

import { Box, Typography } from '@mui/material';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import RangeSlider from 'react-range-slider-input';

import { chartsTextLabelSx, dateSliderContainerSx } from '../chartsPanelStyles';

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
  const { t } = useSafeTranslation();

  return (
    <Box sx={dateSliderContainerSx}>
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
          <Typography sx={chartsTextLabelSx} variant="body2">
            {t('Start')}
          </Typography>
          {': '}
          <Typography sx={chartsTextLabelSx}>
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
          <Typography sx={chartsTextLabelSx} variant="body2">
            {t('End')}
          </Typography>
          {': '}
          <Typography sx={chartsTextLabelSx}>
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
