import { Box, GlobalStyles, Typography } from '@mui/material';
import DatePickerPopperPortal from 'components/Common/DatePickerPopperPortal';
import {
  CALENDAR_POPPER_CLASS,
  calendarPopperGlobalStyles,
} from 'components/Common/formComponentStyles';
import { WMSLayerProps } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { useContext, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { dateWithoutTime } from 'utils/date-utils';
import { getPossibleDatesForLayer } from 'utils/server-utils';

import PrintConfigContext from './printConfig.context';

function DateRangePicker() {
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <GlobalStyles styles={calendarPopperGlobalStyles} />
      <Box
        sx={theme => ({
          display: 'flex',
          flexDirection: 'row',
          gap: theme.spacing(2),
        })}
      >
        <Box
          sx={{
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
          }}
        >
          <Typography
            variant="body1"
            sx={theme => ({
              marginBottom: theme.spacing(0.5),
            })}
          >
            {t('Start date')}
          </Typography>
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
            popperClassName={CALENDAR_POPPER_CLASS}
            popperContainer={DatePickerPopperPortal}
          />
        </Box>

        <Box
          sx={{
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
          }}
        >
          <Typography
            variant="body1"
            sx={theme => ({
              marginBottom: theme.spacing(0.5),
            })}
          >
            {t('End date')}
          </Typography>
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
            placeholderText="dd/mm/yyyy"
            showPopperArrow={false}
            popperClassName={CALENDAR_POPPER_CLASS}
            popperContainer={DatePickerPopperPortal}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default DateRangePicker;
