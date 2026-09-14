import { Box } from '@mui/material';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import { LayerKey } from 'config/types';
import { useSafeTranslation } from 'i18n';

import { dropdownFullWidthSx, formContainerSx } from '../formComponentStyles';

interface BaselineLayerSelectorProps {
  value: LayerKey | undefined;
  onChange: (layerId: LayerKey | undefined) => void;
  className?: string;
  disabled?: boolean;
}

function BaselineLayerSelector({
  value,
  onChange,
  className,
  disabled = false,
}: BaselineLayerSelectorProps) {
  const { t } = useSafeTranslation();

  return (
    <Box sx={formContainerSx()}>
      <Box sx={dropdownFullWidthSx}>
        <LayerDropdown
          type="admin_level_data"
          value={value || ''}
          setValue={onChange}
          className={className}
          label={t('Baseline Layer')}
          placeholder={t('Choose baseline layer')}
          disabled={disabled}
        />
      </Box>
    </Box>
  );
}

export default BaselineLayerSelector;
