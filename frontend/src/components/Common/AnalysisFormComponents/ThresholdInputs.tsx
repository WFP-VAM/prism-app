import { Box, TextField, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { AggregationOperations } from 'config/types';
import { useSafeTranslation } from 'i18n';
import React, { useCallback, useState } from 'react';

import { colorBlackSx, formContainerSx } from '../formComponentStyles';

const rowInputContainerSx = {
  display: 'flex',
  alignItems: 'center',
  marginTop: '10px',
} satisfies SxProps<Theme>;

const numberFieldSx = {
  paddingRight: '10px',
  maxWidth: '140px',
  '& label': {
    color: '#333333',
  },
} satisfies SxProps<Theme>;

interface ThresholdInputsProps {
  belowThreshold: string;
  aboveThreshold: string;
  onBelowThresholdChange: (value: string) => void;
  onAboveThresholdChange: (value: string) => void;
  statistic?: AggregationOperations;
  requiredThresholdNotSet?: boolean;
  disabled?: boolean;
}

function ThresholdInputs({
  belowThreshold,
  aboveThreshold,
  onBelowThresholdChange,
  onAboveThresholdChange,
  statistic,
  requiredThresholdNotSet = false,
  disabled = false,
}: ThresholdInputsProps) {
  const { t } = useSafeTranslation();
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const validateThresholds = useCallback((below: string, above: string) => {
    const belowValue = parseFloat(below);
    const aboveValue = parseFloat(above);

    if (
      !Number.isNaN(belowValue) &&
      !Number.isNaN(aboveValue) &&
      belowValue > aboveValue
    ) {
      setThresholdError('Below threshold is larger than above threshold!');
    } else {
      setThresholdError(null);
    }
  }, []);

  const handleBelowThresholdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      onBelowThresholdChange(value);
      validateThresholds(value, aboveThreshold);
    },
    [aboveThreshold, onBelowThresholdChange, validateThresholds],
  );

  const handleAboveThresholdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      onAboveThresholdChange(value);
      validateThresholds(belowThreshold, value);
    },
    [belowThreshold, onAboveThresholdChange, validateThresholds],
  );

  const showPercentageLabel =
    statistic === AggregationOperations['Area exposed'];

  return (
    <Box sx={formContainerSx()}>
      <Typography sx={colorBlackSx} variant="body2">
        {t('Threshold')}
      </Typography>

      {requiredThresholdNotSet && (
        <Typography style={{ color: 'red' }}>
          {t(
            'A threshold is required when running an analysis for this type of layer. To generate statistics without a threshold, choose an administrative level as the baseline layer.',
          )}
        </Typography>
      )}

      <Box sx={rowInputContainerSx}>
        <TextField
          id="outlined-number-low"
          error={!!thresholdError}
          helperText={t(thresholdError || '')}
          sx={numberFieldSx}
          label={t('Below')}
          type="number"
          value={belowThreshold}
          onChange={handleBelowThresholdChange}
          variant="outlined"
          disabled={disabled}
        />
        <TextField
          id="outlined-number-high"
          label={t('Above')}
          sx={numberFieldSx}
          value={aboveThreshold}
          onChange={handleAboveThresholdChange}
          type="number"
          variant="outlined"
          disabled={disabled}
        />
        {showPercentageLabel && (
          <Typography sx={colorBlackSx} variant="body1">
            %
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default ThresholdInputs;
