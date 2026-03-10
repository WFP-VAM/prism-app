import React, { useContext } from 'react';
import {
  Box,
  TextField,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { getFormattedDate } from 'utils/date-utils';
import { BatchCadence } from 'utils/batchCadenceUtils';
import { useSafeTranslation } from '../../../i18n';
import PrintConfigContext from './printConfig.context';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    row: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap',
    },
    toggleButton: {
      fontSize: '0.75rem',
      textTransform: 'none',
      padding: '4px 10px',
    },
    intervalInput: {
      zIndex: 0,
    },
    dateList: {
      maxHeight: '120px',
      overflowY: 'auto',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      padding: '4px',
      backgroundColor: 'white',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    dateChip: {
      color: '#000',
      fontSize: '0.7rem',
      padding: '2px 6px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    },
  }),
);

const CADENCE_LABELS: Record<BatchCadence, string> = {
  'every-n-dekads': 'Every N dekads',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export default function CadenceSelector() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { printConfig } = useContext(PrintConfigContext);

  if (!printConfig) {
    return null;
  }

  const {
    cadence,
    setCadence,
    dekadInterval,
    setDekadInterval,
    filteredBatchDates,
    disabledCadences,
  } = printConfig;

  const cadenceOptions: BatchCadence[] = [
    'every-n-dekads',
    'monthly',
    'quarterly',
  ];

  return (
    <Box className={classes.root}>
      <Typography variant="body2">{t('Cadence')}</Typography>
      <Box className={classes.row}>
        <ToggleButtonGroup
          value={cadence}
          exclusive
          size="small"
          onChange={(_e, value: BatchCadence | null) => {
            if (value !== null) {
              if (!disabledCadences.has(value)) {
                setCadence(value);
              }
            }
          }}
        >
          {cadenceOptions.map(option => {
            const isDisabled = disabledCadences.has(option);
            return (
              <ToggleButton
                key={option}
                value={option}
                disabled={isDisabled}
                className={classes.toggleButton}
              >
                {t(CADENCE_LABELS[option])}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
        {cadence === 'every-n-dekads' && (
          <TextField
            className={classes.intervalInput}
            type="number"
            size="small"
            variant="outlined"
            label="Dekad interval"
            value={dekadInterval}
            inputProps={{ min: 1 }}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val) && val >= 1) {
                setDekadInterval(val);
              }
            }}
          />
        )}
      </Box>
      {filteredBatchDates.length > 0 && (
        <Box className={classes.dateList}>
          {filteredBatchDates.map(ts => (
            <span key={ts} className={classes.dateChip}>
              {getFormattedDate(ts, 'localeShortUTC')}
            </span>
          ))}
        </Box>
      )}
    </Box>
  );
}
