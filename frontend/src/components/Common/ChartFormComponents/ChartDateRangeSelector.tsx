import {Typography, Input} from '@mui/material';
import { makeStyles } from '@mui/styles';
import DatePicker from 'react-datepicker';
import { useSafeTranslation } from 'i18n';
import { useState, useEffect } from 'react';

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
  const classes = useStyles();
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
    <div className={classes.container}>
      {!hideLabel && (
        <Typography className={classes.label} variant="body2">
          {t('Date Range')}
        </Typography>
      )}
      <div
        className={classes.dateFieldsRow}
        style={{ flexDirection: stacked ? 'column' : 'row' }}
      >
        <div className={classes.dateField}>
          <Typography className={classes.fieldLabel} variant="body2">
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
            dateFormat="MMM d, yyyy"
            customInput={<Input className={classes.chartPanelParamText} />}
            popperClassName={classes.calendarPopper}
          />
        </div>
        <div className={classes.dateField}>
          <Typography className={classes.fieldLabel} variant="body2">
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
            dateFormat="MMM d, yyyy"
            customInput={<Input className={classes.chartPanelParamText} />}
            popperClassName={classes.calendarPopper}
          />
        </div>
      </div>
      {dateError && (
        <Typography className={classes.errorText} variant="caption">
          {dateError}
        </Typography>
      )}
    </div>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 20,
    marginLeft: 10,
    width: '90%',
    color: 'black',
  },
  label: {
    color: 'black',
    marginBottom: 8,
    fontWeight: 600,
  },
  fieldLabel: {
    color: 'black',
    marginBottom: 8,
    fontSize: '0.875rem',
  },
  dateFieldsRow: {
    display: 'flex',
    gap: '16px',
    width: '100%',
  },
  dateField: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chartPanelParamText: {
    width: '100%',
    color: 'black',
    '&.MuiInput-underline:before': {
      borderBottomColor: 'rgba(0, 0, 0, 0.42)',
    },
    '&.MuiInput-underline:hover:before': {
      borderBottomColor: 'rgba(0, 0, 0, 0.87)',
    },
  },
  calendarPopper: {
    zIndex: 3,
  },
  errorText: {
    color: '#d32f2f',
    marginTop: 8,
    fontSize: '0.75rem',
  },
}));

export default ChartDateRangeSelector;
