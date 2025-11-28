import { Chip } from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { cyanBlue } from 'muiTheme';
import { memo, useCallback, useEffect, useState } from 'react';

const useStyles = makeStyles(() =>
  createStyles({
    chipRoot: {
      marginLeft: '3%',
    },
  }),
);

interface SelectedLayersInformationProps {
  selectedCategoryLayers: LayerType[];
}

const SelectedLayersInformation = memo(
  ({ selectedCategoryLayers }: SelectedLayersInformationProps) => {
    const classes = useStyles();
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
        classes={{ root: classes.chipRoot }}
        style={{ backgroundColor: cyanBlue }}
        label={informationChipLabel}
      />
    );
  },
);

export default SelectedLayersInformation;
