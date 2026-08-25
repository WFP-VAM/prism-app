import { Chip } from '@mui/material';
import { selectedLayersChipSx } from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useCallback, useEffect, useState } from 'react';

interface SelectedLayersInformationProps {
  selectedCategoryLayers: LayerType[];
}

const SelectedLayersInformation = memo(
  ({ selectedCategoryLayers }: SelectedLayersInformationProps) => {
    const { t } = useSafeTranslation();
    const [informationChipLabel, setInformationChipLabel] = useState<string>(
      selectedCategoryLayers.length.toString(),
    );

    useEffect(() => {
      if (!selectedCategoryLayers.length) {
        return;
      }
      setInformationChipLabel(selectedCategoryLayers.length.toString());
    }, [selectedCategoryLayers.length]);

    const handleChipOnMouseEnter = useCallback(() => {
      setInformationChipLabel(
        `${selectedCategoryLayers.length} ${t('Active Layer(s)')}`,
      );
    }, [selectedCategoryLayers.length, t]);

    const handleChipOnMouseLeave = useCallback(() => {
      setInformationChipLabel(selectedCategoryLayers.length.toString());
    }, [selectedCategoryLayers.length]);

    if (!selectedCategoryLayers.length) {
      return null;
    }
    return (
      <Chip
        onMouseEnter={handleChipOnMouseEnter}
        onMouseLeave={handleChipOnMouseLeave}
        sx={selectedLayersChipSx}
        label={informationChipLabel}
      />
    );
  },
);

export default SelectedLayersInformation;
