import { Box, Input, InputAdornment, Typography } from '@mui/material';
import { DateRangeRounded } from '@mui/icons-material';
import { makeStyles, createStyles } from '@mui/styles';
import DatePicker from 'react-datepicker';
import React, { memo } from 'react';
import { useSafeTranslation } from 'i18n';

const useStyles = makeStyles(() =>
  createStyles({
    calendarPopper: {
      zIndex: 3,
    },
    datePickerContainer: {
      marginTop: 5,
      width: 'auto',
      color: 'black',
      display: 'flex',
      minWidth: 300,
      justifyContent: 'space-between',
    },
    textLabel: {
      color: 'black',
    },
    wrapper: {
      marginTop: 20,
      paddingLeft: 20,
      paddingRight: 20,
    },
    wrapperLabel: {
      color: 'black',
      fontWeight: 'bold',
    },
  }),
);

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
    const styles = useStyles();
    const { t } = useSafeTranslation();

    return (
      <Box className={styles.wrapper} style={wrapperStyle}>
        {title && (
          <Typography className={styles.wrapperLabel} variant="body2">
            {title}
          </Typography>
        )}
        <Box className={styles.datePickerContainer}>
          <Box p={2} style={{ borderBottom: '1px solid #858585' }}>
            <Typography className={styles.textLabel} variant="body2">
              {`${t(startLabel)}: `}
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

          <Box p={2} style={{ borderBottom: '1px solid #858585' }}>
            <Typography className={styles.textLabel} variant="body2">
              {`${t(endLabel)}: `}
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
