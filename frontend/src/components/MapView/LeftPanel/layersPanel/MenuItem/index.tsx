import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { layerMenuItemAccordionSx } from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import MenuSwitch from 'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch';
import { filterActiveLayers } from 'components/MapView/utils';
import { LayersCategoryType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useMemo } from 'react';
import { useMapState } from 'utils/useMapState';

import SelectedLayersInformation from './SelectedLayersInformation';
import { makeSafeIDFromTitle } from './utils';

interface MenuItemProps {
  title: string;
  layersCategories: LayersCategoryType[];
  extent?: Extent;
}

const MenuItem = memo(({ title, layersCategories, extent }: MenuItemProps) => {
  const { t } = useSafeTranslation();
  const mapState = useMapState();
  const selectedLayers = mapState.layers;

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
      sx={layerMenuItemAccordionSx.root}
      slotProps={{ transition: { unmountOnExit: true } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={layerMenuItemAccordionSx.summary}
        aria-controls={title}
        id={`level1-${makeSafeIDFromTitle(title)}`}
      >
        <Typography sx={layerMenuItemAccordionSx.title}>{t(title)}</Typography>
        <SelectedLayersInformation
          selectedCategoryLayers={selectedCategoryLayers}
        />
      </AccordionSummary>
      <AccordionDetails sx={layerMenuItemAccordionSx.details}>
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
