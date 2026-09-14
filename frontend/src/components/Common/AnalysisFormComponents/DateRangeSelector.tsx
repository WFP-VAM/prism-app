import { Box, Input, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { datePickerPopperProps } from 'components/Common/datePickerPopperProps';
import { useSafeTranslation } from 'i18n';
import DatePicker from 'react-datepicker';

import {
  analysisPanelParamTextSx,
  colorBlackSx,
  formContainerSx,
} from '../formComponentStyles';

const dateRangePickerSx = {
  display: 'inline-block',
  marginRight: '15px',
  marginTop: '15px',
  minWidth: '125px',
  width: '100px',
} satisfies SxProps<Theme>;

interface DateRangeSelectorProps {
  startDate: number | null;
  endDate: number | null;
  onStartDateChange: (date: number | null) => void;
  onEndDateChange: (date: number | null) => void;
  availableDates?: Date[];
  disabled?: boolean;
}

function DateRangeSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  availableDates = [],
  disabled = false,
}: DateRangeSelectorProps) {
  const { t } = useSafeTranslation();

  const handleStartDateChange = (date: Date | null) => {
    onStartDateChange(date?.getTime() || startDate);
  };

  const handleEndDateChange = (date: Date | null) => {
    onEndDateChange(date?.getTime() || endDate);
  };

  return (
    <Box sx={formContainerSx()}>
      <Typography sx={colorBlackSx} variant="body2">
        {t('Date Range')}
      </Typography>
      <Box sx={dateRangePickerSx}>
        <Typography sx={colorBlackSx} variant="body2">
          {t('Start')}
        </Typography>
        <DatePicker
          selected={startDate ? new Date(startDate) : null}
          onChange={handleStartDateChange}
          maxDate={new Date()}
          todayButton={t('Today')}
          peekNextMonth
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          disabled={disabled}
          customInput={<Input sx={analysisPanelParamTextSx} />}
          {...datePickerPopperProps}
          includeDates={availableDates}
        />
      </Box>
      <Box sx={dateRangePickerSx}>
        <Typography sx={colorBlackSx} variant="body2">
          {t('End')}
        </Typography>
        <DatePicker
          selected={endDate ? new Date(endDate) : null}
          onChange={handleEndDateChange}
          maxDate={new Date()}
          todayButton={t('Today')}
          peekNextMonth
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          disabled={disabled}
          customInput={<Input sx={analysisPanelParamTextSx} />}
          {...datePickerPopperProps}
          includeDates={availableDates}
        />
      </Box>
    </Box>
  );
}

export default DateRangeSelector;
