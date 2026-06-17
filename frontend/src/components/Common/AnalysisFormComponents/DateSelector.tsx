import { DateRangeRounded } from '@mui/icons-material';
import {
  Box,
  GlobalStyles,
  Input,
  InputAdornment,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useSafeTranslation } from 'i18n';
import DatePicker from 'react-datepicker';

import DatePickerPopperPortal from '../DatePickerPopperPortal';
import {
  analysisPanelParamTextSx,
  CALENDAR_POPPER_CLASS,
  calendarPopperGlobalStyles,
  colorBlackSx,
} from '../formComponentStyles';

const datePickerContainerSx = {
  marginLeft: '10px',
  marginBottom: '30px',
  width: 'auto',
  color: 'black',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
} satisfies SxProps<Theme>;

interface DateSelectorProps {
  selectedDate: number | null;
  onDateChange: (date: number | null) => void;
  availableDates?: Date[];
  label?: string;
  disabled?: boolean;
}

function DateSelector({
  selectedDate,
  onDateChange,
  availableDates = [],
  label,
  disabled = false,
}: DateSelectorProps) {
  const { t } = useSafeTranslation();

  const handleDateChange = (date: Date | null) => {
    onDateChange(date?.getTime() || selectedDate);
  };

  return (
    <Box sx={datePickerContainerSx}>
      <GlobalStyles styles={calendarPopperGlobalStyles} />
      <Typography sx={colorBlackSx} variant="body2">
        {`${label || t('Date')}: `}
      </Typography>
      <DatePicker
        locale={t('date_locale')}
        dateFormat="PP"
        selected={selectedDate ? new Date(selectedDate) : null}
        onChange={handleDateChange}
        maxDate={new Date()}
        todayButton={t('Today')}
        peekNextMonth
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        disabled={disabled}
        customInput={
          <Input
            sx={analysisPanelParamTextSx}
            disableUnderline
            disabled={disabled}
            endAdornment={
              <InputAdornment position="end">
                <DateRangeRounded />
              </InputAdornment>
            }
          />
        }
        popperClassName={CALENDAR_POPPER_CLASS}
        popperContainer={DatePickerPopperPortal}
        includeDates={availableDates}
      />
    </Box>
  );
}

export default DateSelector;
