import { Box, GlobalStyles, Input, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useSafeTranslation } from 'i18n';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';

import {
  CALENDAR_POPPER_CLASS,
  calendarPopperGlobalStyles,
  chartPanelParamTextSx,
  colorBlackSx,
  formContainerSx,
} from '../formComponentStyles';

const containerSx = formContainerSx(20);

const labelSx = {
  ...colorBlackSx,
  marginBottom: '8px',
  fontWeight: 600,
} satisfies SxProps<Theme>;

const fieldLabelSx = {
  ...colorBlackSx,
  marginBottom: '8px',
  fontSize: '0.875rem',
} satisfies SxProps<Theme>;

const dateFieldsRowSx = {
  display: 'flex',
  gap: '16px',
  width: '100%',
} satisfies SxProps<Theme>;

const dateFieldSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
} satisfies SxProps<Theme>;

const errorTextSx = {
  color: '#d32f2f',
  marginTop: '8px',
  fontSize: '0.75rem',
} satisfies SxProps<Theme>;

interface ChartDateRangeSelectorProps {
  startDate: number | null;
  endDate: number | null;
  onStartDateChange: (date: number | null) => void;
  onEndDateChange: (date: number | null) => void;
  disabled?: boolean;
  stacked?: boolean;
  hideLabel?: boolean;
}

function ChartDateRangeSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  stacked = false,
  hideLabel = false,
}: ChartDateRangeSelectorProps) {
  const { t } = useSafeTranslation();
  const [dateError, setDateError] = useState<string | null>(null);

  // Validate date range whenever dates change
  useEffect(() => {
    if (startDate && endDate) {
      if (endDate <= startDate) {
        setDateError(t('End date must be after start date'));
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [startDate, endDate, t]);

  const handleStartDateChange = (date: Date | null) => {
    const newStartDate = date?.getTime() || startDate;
    onStartDateChange(newStartDate);
  };

  const handleEndDateChange = (date: Date | null) => {
    const newEndDate = date?.getTime() || endDate;
    onEndDateChange(newEndDate);
  };

  return (
    <Box sx={containerSx}>
      <GlobalStyles styles={calendarPopperGlobalStyles} />
      {!hideLabel && (
        <Typography sx={labelSx} variant="body2">
          {t('Date Range')}
        </Typography>
      )}
      <Box
        sx={dateFieldsRowSx}
        style={{ flexDirection: stacked ? 'column' : 'row' }}
      >
        <Box sx={dateFieldSx}>
          <Typography sx={fieldLabelSx} variant="body2">
            {t('Start')}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            selected={startDate ? new Date(startDate) : null}
            onChange={handleStartDateChange}
            maxDate={new Date()}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            disabled={disabled}
            customInput={<Input sx={chartPanelParamTextSx} />}
            popperClassName={CALENDAR_POPPER_CLASS}
          />
        </Box>
        <Box sx={dateFieldSx}>
          <Typography sx={fieldLabelSx} variant="body2">
            {t('End')}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            selected={endDate ? new Date(endDate) : null}
            onChange={handleEndDateChange}
            maxDate={new Date()}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            disabled={disabled}
            customInput={<Input sx={chartPanelParamTextSx} />}
            popperClassName={CALENDAR_POPPER_CLASS}
          />
        </Box>
      </Box>
      {dateError && (
        <Typography sx={errorTextSx} variant="caption">
          {dateError}
        </Typography>
      )}
    </Box>
  );
}

export default ChartDateRangeSelector;
