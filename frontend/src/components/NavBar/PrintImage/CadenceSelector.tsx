import { Box, TextField, Typography } from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useContext } from 'react';
import { BatchCadence, MAX_DEKAD_INTERVAL } from 'utils/batchCadenceUtils';
import { getFormattedDate } from 'utils/date-utils';

import { useSafeTranslation } from '../../../i18n';
import PrintConfigContext from './printConfig.context';

const CADENCE_LABELS: Record<BatchCadence, string> = {
  'every-n-dekads': 'Every N dekads',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

function getDateFormat(
  cadence: BatchCadence,
): 'localeShortUTC' | 'monthYearUTC' | 'quarterYearUTC' {
  switch (cadence) {
    case 'every-n-dekads':
      return 'localeShortUTC';
    case 'monthly':
      return 'monthYearUTC';
    case 'quarterly':
      return 'quarterYearUTC';
    default:
      return 'localeShortUTC';
  }
}

export default function CadenceSelector() {
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
    availableCadences,
    disabledCadences,
    createScheduledMaps,
  } = printConfig;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: '14px',
          fontWeight: 400,
          marginTop: '8px',
        }}
      >
        {t('Cadence')}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
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
          {availableCadences.map(option => {
            const isDisabled = disabledCadences.has(option);
            return (
              <ToggleButton
                key={option}
                value={option}
                disabled={isDisabled}
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  padding: '4px 10px',
                  marginBottom: '8px',
                }}
              >
                {t(CADENCE_LABELS[option])}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
        {cadence === 'every-n-dekads' && (
          <TextField
            sx={{
              zIndex: 0,
              marginBottom: '8px',
              minWidth: '7.5rem',
              flex: '0 0 auto',
              '& .MuiOutlinedInput-root': {
                width: '100%',
              },
              '& input': {
                fontSize: '0.875rem',
              },
            }}
            type="number"
            size="small"
            variant="outlined"
            label={t('Dekad interval')}
            value={dekadInterval}
            slotProps={{ htmlInput: { min: 1, max: MAX_DEKAD_INTERVAL } }}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (Number.isNaN(val)) {
                return;
              }
              setDekadInterval(Math.min(MAX_DEKAD_INTERVAL, Math.max(1, val)));
            }}
          />
        )}
      </Box>
      {!createScheduledMaps && filteredBatchDates.length > 0 && (
        <Box
          sx={{
            maxHeight: '120px',
            overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            padding: '4px',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        >
          {filteredBatchDates.map(ts => (
            <Box
              component="span"
              key={ts}
              sx={{
                color: '#000',
                fontSize: '0.7rem',
                padding: '2px 6px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {getFormattedDate(ts, getDateFormat(cadence))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
