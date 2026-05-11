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
import { useSelector } from 'react-redux';
import { availableDatesSelector } from 'context/serverStateSlice';
import { LayerDefinitions } from 'config/utils';
import { WMSLayerProps } from 'config/types';
import { getPossibleDatesForLayer } from 'utils/server-utils';
import { dateWithoutTime } from 'utils/date-utils';
import PrintConfigContext from './printConfig.context';

function DateRangePicker() {
  const classes = useStyles();
  const { t } = useTranslation();
  const { printConfig } = useContext(PrintConfigContext);
  const availableDates = useSelector(availableDatesSelector);

  const selectedLayer = useMemo(() => {
    if (!printConfig?.selectedLayerId) {
      return null;
    }
    const layer = LayerDefinitions[printConfig.selectedLayerId];
    return layer?.type === 'wms' ? (layer as WMSLayerProps) : null;
  }, [printConfig?.selectedLayerId]);

  const layerDates = useMemo(() => {
    if (!selectedLayer) {
      return [];
    }
    const dateItems = getPossibleDatesForLayer(selectedLayer, availableDates);
    return [...new Set(dateItems.map(item => item.displayDate))].sort(
      (a, b) => a - b,
    );
  }, [selectedLayer, availableDates]);

  const includedDates = useMemo(
    () => new Set(layerDates.map(dateWithoutTime)),
    [layerDates],
  );

  const minDate = useMemo(
    () => (layerDates.length > 0 ? new Date(layerDates[0]) : undefined),
    [layerDates],
  );

  const maxDate = useMemo(
    () =>
      layerDates.length > 0
        ? new Date(layerDates[layerDates.length - 1])
        : undefined,
    [layerDates],
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
          {/* @ts-expect-error - react-datepicker v2 types incompatible with React 18 */}
          <DatePicker
            locale={t('date_locale')}
            dateFormat="dd/MM/yyyy"
            selected={startDate ? new Date(startDate) : null}
            onChange={handleStartDateChange}
            maxDate={endDate ? new Date(endDate) : maxDate}
            filterDate={(date: Date) =>
              includedDates.has(dateWithoutTime(date))
            }
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
          {/* @ts-expect-error - react-datepicker v2 types incompatible with React 18 */}
          <DatePicker
            locale={t('date_locale')}
            dateFormat="dd/MM/yyyy"
            selected={endDate ? new Date(endDate) : null}
            onChange={handleEndDateChange}
            minDate={startDate ? new Date(startDate) : minDate}
            filterDate={(date: Date) =>
              includedDates.has(dateWithoutTime(date))
            }
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
