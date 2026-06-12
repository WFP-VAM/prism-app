import {
  Box,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  AggregationOperations,
  ExposureOperator,
  ExposureValue,
  WMSLayerProps,
} from 'config/types';
import { useSafeTranslation } from 'i18n';
import React, { useMemo } from 'react';

import {
  analysisPanelParamTextSx,
  colorBlackSx,
  formContainerSx,
} from '../formComponentStyles';

const radioOptionsSx = {
  color: '#333333',
  opacity: 0.6,
  '&.Mui-checked': {
    color: '#4CA1AD',
    opacity: 1,
  },
} satisfies SxProps<Theme>;

const exposureValueContainerSx = {
  display: 'flex',
  flexDirection: 'row',
  gap: '16px',
} satisfies SxProps<Theme>;

const exposureValueOptionsInputContainerSx = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  margin: '8px 0',
} satisfies SxProps<Theme>;

const exposureValueOptionsSelectSx = {
  width: '100%',
  '& .MuiFormLabel-root': {
    color: 'black',
    '&:hover fieldset': {
      borderColor: '#333333',
    },
  },
} satisfies SxProps<Theme>;

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
            control={<Radio sx={radioOptionsSx} color="default" size="small" />}
            label={
              <Typography sx={analysisPanelParamTextSx}>{t(key)}</Typography>
            }
          />
        )),
    [t, disabled],
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
    <Box sx={formContainerSx()}>
      <Typography sx={colorBlackSx} variant="body2">
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
        <Box sx={exposureValueContainerSx}>
          <FormControl
            component="div"
            sx={exposureValueOptionsInputContainerSx}
          >
            <TextField
              select
              variant="outlined"
              label={t('Operator')}
              sx={exposureValueOptionsSelectSx}
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
            sx={exposureValueOptionsInputContainerSx}
          >
            <TextField
              select
              variant="outlined"
              label={t('Exposure value')}
              sx={exposureValueOptionsSelectSx}
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
        </Box>
      )}
    </Box>
  );
}

export default StatisticSelector;
