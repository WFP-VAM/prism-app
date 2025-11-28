import React from 'react';
import { makeStyles } from '@mui/styles';
import {FormControl,
  InputLabel,
  MenuItem,
  Select} from '@mui/material';
import { LayerKey, WMSLayerProps } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import { useSafeTranslation } from 'i18n';

interface ChartLayerSelectorProps {
  value: LayerKey | undefined;
  onChange: (layerId: LayerKey | undefined) => void;
  className?: string;
  disabled?: boolean;
}

function ChartLayerSelector({
  value,
  onChange,
  className,
  disabled = false,
}: ChartLayerSelectorProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const chartLayers = getWMSLayersWithChart();

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as LayerKey);
  };

  return (
    <div className={classes.container}>
      <FormControl
        variant="outlined"
        className={className || classes.formControl}
        disabled={disabled}
      >
        <InputLabel id="chart-layer-selector-label">
          {t('Chart Layer')}
        </InputLabel>
        <Select
          labelId="chart-layer-selector-label"
          id="chart-layer-selector"
          value={value || ''}
          onChange={handleChange}
          label={t('Chart Layer')}
        >
          <MenuItem value="">
            <em>{t('Select a chart layer')}</em>
          </MenuItem>
          {chartLayers.map((layer: WMSLayerProps) => (
            <MenuItem key={layer.id} value={layer.id}>
              {t(layer.title)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
  formControl: {
    width: '100%',
    '& .MuiFormLabel-root': {
      color: 'black',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#333333',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#333333',
    },
  },
}));

export default ChartLayerSelector;
