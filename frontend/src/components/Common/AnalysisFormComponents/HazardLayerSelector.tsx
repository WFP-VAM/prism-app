import { Box } from '@mui/material';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import { LayerKey } from 'config/types';
import { useSafeTranslation } from 'i18n';

import { dropdownFullWidthSx, formContainerSx } from '../formComponentStyles';

interface HazardLayerSelectorProps {
  value: LayerKey | undefined;
  onChange: (layerId: LayerKey | undefined) => void;
  className?: string;
  disabled?: boolean;
}

function HazardLayerSelector({
  value,
  onChange,
  className,
  disabled = false,
}: HazardLayerSelectorProps) {
  const { t } = useSafeTranslation();

  return (
    <Box sx={formContainerSx()}>
      <Box sx={dropdownFullWidthSx}>
        <LayerDropdown
          type="wms"
          value={value || ''}
          setValue={onChange}
          className={className}
          label={t('Hazard Layer')}
          placeholder="Choose hazard layer"
          disabled={disabled}
        />
      </Box>
    </Box>
  );
}

export default HazardLayerSelector;
