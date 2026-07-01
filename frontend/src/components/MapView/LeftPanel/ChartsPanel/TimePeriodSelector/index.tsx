import { DateRangeRounded } from '@mui/icons-material';
import { Box, Input, InputAdornment, Typography } from '@mui/material';
import { datePickerPopperProps } from 'components/Common/datePickerPopperProps';
import { useSafeTranslation } from 'i18n';
import React, { memo } from 'react';
import DatePicker from 'react-datepicker';

import {
  timePeriodDatePickerContainerSx,
  timePeriodTextLabelSx,
  timePeriodWrapperLabelSx,
  timePeriodWrapperSx,
} from '../chartsPanelStyles';

const TimePeriodSelector = memo(
  ({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    title,
    startLabel,
    endLabel,
    wrapperStyle,
  }: TimePeriodSelectorProps) => {
    const { t } = useSafeTranslation();

    return (
      <Box sx={timePeriodWrapperSx} style={wrapperStyle}>
        {title && (
          <Typography sx={timePeriodWrapperLabelSx} variant="body2">
            {title}
          </Typography>
        )}
        <Box sx={timePeriodDatePickerContainerSx}>
          <Box sx={{ p: 2 }} style={{ borderBottom: '1px solid #858585' }}>
            <Typography sx={timePeriodTextLabelSx} variant="body2">
              {`${t(startLabel)}: `}
            </Typography>
            <DatePicker
              locale={t('date_locale')}
              dateFormat="PP"
              selected={startDate ? new Date(startDate) : null}
              onChange={(date: Date | null) =>
                setStartDate(date?.getTime() ?? startDate)
              }
              maxDate={new Date()}
              todayButton={t('Today')}
              peekNextMonth
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              customInput={
                <Input
                  sx={timePeriodTextLabelSx}
                  disableUnderline
                  endAdornment={
                    <InputAdornment position="end">
                      <DateRangeRounded />
                    </InputAdornment>
                  }
                />
              }
              {...datePickerPopperProps}
            />
          </Box>

          <Box sx={{ p: 2 }} style={{ borderBottom: '1px solid #858585' }}>
            <Typography sx={timePeriodTextLabelSx} variant="body2">
              {`${t(endLabel)}: `}
            </Typography>
            <DatePicker
              locale={t('date_locale')}
              dateFormat="PP"
              selected={endDate ? new Date(endDate) : null}
              onChange={(date: Date | null) =>
                setEndDate(date?.getTime() ?? endDate)
              }
              maxDate={new Date()}
              todayButton={t('Today')}
              peekNextMonth
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              customInput={
                <Input
                  sx={timePeriodTextLabelSx}
                  disableUnderline
                  endAdornment={
                    <InputAdornment position="end">
                      <DateRangeRounded />
                    </InputAdornment>
                  }
                />
              }
              {...datePickerPopperProps}
            />
          </Box>
        </Box>
      </Box>
    );
  },
);

interface TimePeriodSelectorProps {
  startDate: number | null;
  setStartDate: any;
  endDate: number | null;
  setEndDate: any;
  title: string | null;
  startLabel: string;
  endLabel: string;
  wrapperStyle?: React.CSSProperties;
}

export default TimePeriodSelector;
