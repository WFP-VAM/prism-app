import { memo, useMemo } from 'react';
import {
  Grid,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LayersCategoryType } from 'config/types';
import MenuSwitch from 'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { useMapState } from 'utils/useMapState';
import { filterActiveLayers } from 'components/MapView/utils';
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
      TransitionProps={{ unmountOnExit: true }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        classes={{
          root: classes.rootSummary,
          expandIcon: classes.expandIcon,
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
        <Grid container direction="column" wrap="nowrap">
          {layersCategories.map((layerCategory: LayersCategoryType) => (
            <MenuSwitch
              key={layerCategory.title}
              title={layerCategory.title}
              layers={layerCategory.layers}
              extent={extent}
            />
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
});

export default MenuItem;
