import { Typography, Input, makeStyles } from '@material-ui/core';
import DatePicker from 'react-datepicker';
import { useSafeTranslation } from 'i18n';

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
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const handleStartDateChange = (date: Date | null) => {
    onStartDateChange(date?.getTime() || startDate);
  };

  const handleEndDateChange = (date: Date | null) => {
    onEndDateChange(date?.getTime() || endDate);
  };

  return (
    <div className={classes.container}>
      <Typography className={classes.colorBlack} variant="body2">
        {t('Date Range')}
      </Typography>
      <div className={classes.dateRangePicker}>
        <Typography className={classes.colorBlack} variant="body2">
          {t('Start')}
        </Typography>
        {/* @ts-expect-error - react-datepicker v2 types incompatible with React 18 */}
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
          customInput={<Input className={classes.analysisPanelParamText} />}
          popperClassName={classes.calendarPopper}
          includeDates={availableDates}
        />
      </div>
      <div className={classes.dateRangePicker}>
        <Typography className={classes.colorBlack} variant="body2">
          {t('End')}
        </Typography>
        {/* @ts-expect-error - react-datepicker v2 types incompatible with React 18 */}
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
          customInput={<Input className={classes.analysisPanelParamText} />}
          popperClassName={classes.calendarPopper}
          includeDates={availableDates}
        />
      </div>
    </div>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 30,
    marginLeft: 10,
    width: '90%',
    color: 'black',
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
  dateRangePicker: {
    display: 'inline-block',
    marginRight: '15px',
    marginTop: '15px',
    minWidth: '125px',
    width: '100px',
  },
}));

export default DateRangeSelector;
