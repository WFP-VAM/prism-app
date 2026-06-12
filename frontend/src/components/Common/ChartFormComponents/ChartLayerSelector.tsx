import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { LayerKey, WMSLayerProps } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import { useSafeTranslation } from 'i18n';

import { chartFormControlSx, formContainerSx } from '../formComponentStyles';

const containerSx = formContainerSx(30);

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
  const { t } = useSafeTranslation();

  const chartLayers = getWMSLayersWithChart();

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as LayerKey);
  };

  return (
    <Box sx={containerSx}>
      <FormControl
        variant="outlined"
        className={className}
        sx={chartFormControlSx}
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
    </Box>
  );
}

export default ChartLayerSelector;
