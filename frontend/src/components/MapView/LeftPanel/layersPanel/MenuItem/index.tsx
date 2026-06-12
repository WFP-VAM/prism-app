import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';
import { Extent } from 'components/MapView/Layers/raster-utils';
import MenuSwitch from 'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch';
import { filterActiveLayers } from 'components/MapView/utils';
import { LayersCategoryType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useMemo } from 'react';
import { useMapState } from 'utils/useMapState';

import SelectedLayersInformation from './SelectedLayersInformation';
import { makeSafeIDFromTitle, useLayerMenuItemStyles } from './utils';

interface MenuItemProps {
  title: string;
  layersCategories: LayersCategoryType[];
  extent?: Extent;
}

const MenuItem = memo(({ title, layersCategories, extent }: MenuItemProps) => {
  const { t } = useSafeTranslation();
  const mapState = useMapState();
  const selectedLayers = mapState.layers;
  const classes = useLayerMenuItemStyles();

  const categoryLayers = layersCategories
    .map(layerCategory => layerCategory.layers)
    .flat();

  const selectedCategoryLayers = useMemo(
    () =>
      selectedLayers.filter(layer =>
        categoryLayers.some(categoryLayer =>
          filterActiveLayers(layer, categoryLayer),
        ),
      ),
    [categoryLayers, selectedLayers],
  );

  return (
    <Accordion
      elevation={0}
      classes={{ root: classes.root }}
      slotProps={{ transition: { unmountOnExit: true } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        classes={{
          root: classes.rootSummary,
          expandIconWrapper: classes.expandIcon,
          content: classes.summaryContent,
        }}
        aria-controls={title}
        id={`level1-${makeSafeIDFromTitle(title)}`}
      >
        <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
        <SelectedLayersInformation
          selectedCategoryLayers={selectedCategoryLayers}
        />
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.rootDetails }}>
        <Stack direction="column" sx={{ flexWrap: 'nowrap' }}>
          {layersCategories.map((layerCategory: LayersCategoryType) => (
            <MenuSwitch
              key={layerCategory.title}
              title={layerCategory.title}
              layers={layerCategory.layers}
              extent={extent}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});

export default MenuItem;
