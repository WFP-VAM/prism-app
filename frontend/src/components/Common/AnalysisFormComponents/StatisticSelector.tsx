import React, { useMemo } from 'react';
import { makeStyles } from '@mui/styles';
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  AggregationOperations,
  ExposureOperator,
  ExposureValue,
  WMSLayerProps,
} from 'config/types';
import { useSafeTranslation } from 'i18n';

interface StatisticSelectorProps {
  value: AggregationOperations;
  onChange: (statistic: AggregationOperations) => void;
  exposureValue?: ExposureValue;
  onExposureValueChange?: (exposureValue: ExposureValue) => void;
  selectedHazardLayer?: WMSLayerProps | null;
  disabled?: boolean;
}

function StatisticSelector({
  value,
  onChange,
  exposureValue,
  onExposureValueChange,
  selectedHazardLayer,
  disabled = false,
}: StatisticSelectorProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const statisticOptions = useMemo(
    () =>
      Object.entries(AggregationOperations)
        .filter(
          ([, operationValue]) => operationValue !== AggregationOperations.Sum,
        ) // sum is used only for exposure analysis.
        .map(([key, operationValue]) => (
          <FormControlLabel
            key={key}
            value={operationValue}
            disabled={disabled}
            control={
              <Radio
                classes={{
                  root: classes.radioOptions,
                  checked: classes.radioOptionsChecked,
                }}
                color="default"
                size="small"
              />
            }
            label={
              <Typography className={classes.analysisPanelParamText}>
                {t(key)}
              </Typography>
            }
          />
        )),
    [
      classes.analysisPanelParamText,
      classes.radioOptions,
      classes.radioOptionsChecked,
      t,
      disabled,
    ],
  );

  const handleStatisticChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onChange(event.target.value as AggregationOperations);
  };

  const handleExposureOperatorChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (onExposureValueChange && exposureValue) {
      onExposureValueChange({
        ...exposureValue,
        operator: event.target.value as ExposureOperator,
      });
    }
  };

  const handleExposureValueChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (onExposureValueChange && exposureValue) {
      onExposureValueChange({
        ...exposureValue,
        value: event.target.value,
      });
    }
  };

  const showExposureValueControls =
    value === AggregationOperations['Area exposed'];

  return (
    <div className={classes.container}>
      <Typography className={classes.colorBlack} variant="body2">
        {t('Statistic')}
      </Typography>
      <FormControl component="div">
        <RadioGroup
          name="statistics"
          value={value}
          onChange={handleStatisticChange}
        >
          {statisticOptions}
        </RadioGroup>
      </FormControl>

      {showExposureValueControls && exposureValue && onExposureValueChange && (
        <div className={classes.exposureValueContainer}>
          <FormControl
            component="div"
            className={classes.exposureValueOptionsInputContainer}
          >
            <TextField
              select
              variant="outlined"
              label={t('Operator')}
              className={classes.exposureValueOptionsSelect}
              name="exposure-value-operator"
              value={exposureValue.operator}
              onChange={handleExposureOperatorChange}
              disabled={disabled}
            >
              {Object.values(ExposureOperator).map(item => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl
            component="div"
            className={classes.exposureValueOptionsInputContainer}
          >
            <TextField
              select
              variant="outlined"
              label={t('Exposure value')}
              className={classes.exposureValueOptionsSelect}
              name="exposure-value"
              value={exposureValue.value}
              onChange={handleExposureValueChange}
              disabled={disabled}
            >
              {selectedHazardLayer?.legend?.map(item => (
                <MenuItem key={item.value} value={item.value}>
                  {`${item.label} (${item.value})`}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
        </div>
      )}
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
  analysisPanelParamText: {
    width: '100%',
    color: 'black',
  },
  radioOptions: {
    color: '#333333',
    opacity: 0.6,
  },
  radioOptionsChecked: {
    color: '#4CA1AD',
    opacity: 1,
  },
  exposureValueContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
  },
  exposureValueOptionsInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    margin: '8px 0',
  },
  exposureValueOptionsSelect: {
    width: '100%',
    '& .MuiFormLabel-root': {
      color: 'black',
      '&:hover fieldset': {
        borderColor: '#333333',
      },
    },
  },
}));

export default StatisticSelector;
