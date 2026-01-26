import {
  Typography,
  Input,
  InputAdornment,
  makeStyles,
} from '@material-ui/core';
import { DateRangeRounded } from '@material-ui/icons';
import DatePicker from 'react-datepicker';
import { useSafeTranslation } from 'i18n';

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
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const handleDateChange = (date: Date | null) => {
    onDateChange(date?.getTime() ?? null);
  };

  return (
    <div className={classes.datePickerContainer}>
      <Typography className={classes.colorBlack} variant="body2">
        {`${label || t('Date')}: `}
      </Typography>
      {/* @ts-expect-error - react-datepicker v2 types incompatible with React 18 */}
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
            className={classes.analysisPanelParamText}
            disableUnderline
            disabled={disabled}
            endAdornment={
              <InputAdornment position="end">
                <DateRangeRounded />
              </InputAdornment>
            }
          />
        }
        popperClassName={classes.calendarPopper}
        includeDates={availableDates}
      />
    </div>
  );
}

const useStyles = makeStyles(() => ({
  datePickerContainer: {
    marginLeft: 10,
    marginBottom: 30,
    width: 'auto',
    color: 'black',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBlack: {
    color: 'black',
  },
  analysisPanelParamText: {
    width: '100%',
    color: 'black',
  },
  calendarPopper: {
    zIndex: 3,
  },
}));

export default DateSelector;
