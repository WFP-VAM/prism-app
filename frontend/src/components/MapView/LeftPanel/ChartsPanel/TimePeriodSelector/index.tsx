import {
  Box,
  createStyles,
  Input,
  InputAdornment,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { DateRangeRounded } from '@material-ui/icons';
import DatePicker from 'react-datepicker';
import React, { memo } from 'react';
import { useSafeTranslation } from 'i18n';

const useStyles = makeStyles(() =>
  createStyles({
    calendarPopper: {
      zIndex: 3,
    },
    datePickerContainer: {
      marginTop: 45,
      paddingLeft: 20,
      paddingRight: 20,
      width: 'auto',
      color: 'black',
      display: 'flex',
      minWidth: 300,
    },
    textLabel: {
      color: 'black',
    },
  }),
);

const TimePeriodSelector = memo(
  ({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  }: TimePeriodSelectorProps) => {
    const styles = useStyles();
    const { t } = useSafeTranslation();

    return (
      <Box className={styles.datePickerContainer}>
        <Box p={2} flexGrow={1} style={{ borderBottom: '1px solid #858585' }}>
          <Typography className={styles.textLabel} variant="body2">
            {`${t('Start')}: `}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            selected={startDate ? new Date(startDate) : null}
            onChange={date => setStartDate(date?.getTime() || startDate)}
            maxDate={new Date()}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={
              <Input
                className={styles.textLabel}
                disableUnderline
                endAdornment={
                  <InputAdornment position="end">
                    <DateRangeRounded />
                  </InputAdornment>
                }
              />
            }
            popperClassName={styles.calendarPopper}
          />
        </Box>

        <Box p={2} flexGrow={1} style={{ borderBottom: '1px solid #858585' }}>
          <Typography className={styles.textLabel} variant="body2">
            {`${t('End')}: `}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            selected={endDate ? new Date(endDate) : null}
            onChange={date => setEndDate(date?.getTime() || endDate)}
            maxDate={new Date()}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={
              <Input
                className={styles.textLabel}
                disableUnderline
                endAdornment={
                  <InputAdornment position="end">
                    <DateRangeRounded />
                  </InputAdornment>
                }
              />
            }
            popperClassName={styles.calendarPopper}
          />
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
}

export default TimePeriodSelector;
