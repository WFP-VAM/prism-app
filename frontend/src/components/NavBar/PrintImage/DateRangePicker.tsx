import { useMemo, useContext } from 'react';
import {
  Box,
  Typography,
  Theme,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import DatePicker from 'react-datepicker';
import { useTranslation } from 'react-i18next';
import useLayers from 'utils/layers-utils';
import PrintConfigContext from './printConfig.context';

function DateRangePicker() {
  const classes = useStyles();
  const { t } = useTranslation();
  const { printConfig } = useContext(PrintConfigContext);
  const { selectedLayerDates } = useLayers();

  const includedDates = useMemo(
    () => selectedLayerDates.map(timestamp => new Date(timestamp)),
    [selectedLayerDates],
  );

  const minDate = useMemo(
    () =>
      selectedLayerDates.length > 0
        ? new Date(selectedLayerDates[0])
        : undefined,
    [selectedLayerDates],
  );

  const maxDate = useMemo(
    () =>
      selectedLayerDates.length > 0
        ? new Date(selectedLayerDates[selectedLayerDates.length - 1])
        : undefined,
    [selectedLayerDates],
  );

  if (!printConfig) {
    return null;
  }

  const { dateRange, setDateRange } = printConfig;
  const { startDate, endDate } = dateRange;

  const handleStartDateChange = (date: Date | null) => {
    setDateRange(prev => ({ ...prev, startDate: date?.getTime() ?? null }));
  };

  const handleEndDateChange = (date: Date | null) => {
    setDateRange(prev => ({ ...prev, endDate: date?.getTime() ?? null }));
  };

  return (
    <Box className={classes.wrapper}>
      <Box className={classes.container}>
        <Box className={classes.dateInputContainer}>
          <Typography variant="body1" className={classes.label}>
            {t('Start date')}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="dd/MM/yyyy"
            selected={startDate ? new Date(startDate) : null}
            onChange={handleStartDateChange}
            maxDate={endDate ? new Date(endDate) : maxDate}
            includeDates={includedDates}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            placeholderText="dd/mm/yyyy"
            showPopperArrow={false}
          />
        </Box>

        <Box className={classes.dateInputContainer}>
          <Typography variant="body1" className={classes.label}>
            {t('End date')}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="dd/MM/yyyy"
            selected={endDate ? new Date(endDate) : null}
            onChange={handleEndDateChange}
            minDate={startDate ? new Date(startDate) : minDate}
            includeDates={includedDates}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            popperModifiers={{
              flip: {
                enabled: true,
              },
            }}
            placeholderText="dd/mm/yyyy"
            showPopperArrow={false}
          />
        </Box>
      </Box>
    </Box>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
    },
    container: {
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing(2),
    },
    dateInputContainer: {
      flex: '1 0 0',
      display: 'flex',
      flexDirection: 'column',
      '& > div': {
        width: '100%',
      },
      '& input': {
        width: '100%',
        boxSizing: 'border-box',
      },
    },
    label: {
      marginBottom: theme.spacing(0.5),
    },
    error: {
      marginTop: theme.spacing(1),
      width: '100%',
    },
  }),
);

export default DateRangePicker;
