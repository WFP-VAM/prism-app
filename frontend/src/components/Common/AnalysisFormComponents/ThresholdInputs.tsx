import React, { useState, useCallback } from 'react';
import { makeStyles } from '@mui/styles';
import { TextField, Typography } from '@mui/material';
import { AggregationOperations } from 'config/types';
import { useSafeTranslation } from 'i18n';

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
  const classes = useStyles();
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
    <div className={classes.container}>
      <Typography className={classes.colorBlack} variant="body2">
        {t('Threshold')}
      </Typography>

      {requiredThresholdNotSet && (
        <Typography style={{ color: 'red' }}>
          {t(
            'A threshold is required when running an analysis for this type of layer. To generate statistics without a threshold, choose an administrative level as the baseline layer.',
          )}
        </Typography>
      )}

      <div className={classes.rowInputContainer}>
        <TextField
          id="outlined-number-low"
          error={!!thresholdError}
          helperText={t(thresholdError || '')}
          className={classes.numberField}
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
          classes={{ root: classes.numberField }}
          value={aboveThreshold}
          onChange={handleAboveThresholdChange}
          type="number"
          variant="outlined"
          disabled={disabled}
        />
        {showPercentageLabel && (
          <Typography className={classes.colorBlack} variant="body1">
            %
          </Typography>
        )}
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
  rowInputContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '10px',
  },
  numberField: {
    paddingRight: '10px',
    maxWidth: '140px',
    '& label': {
      color: '#333333',
    },
  },
}));

export default ThresholdInputs;
