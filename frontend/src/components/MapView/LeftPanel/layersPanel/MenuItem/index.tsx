import React, { memo, useMemo } from 'react';
import {
  createStyles,
  Grid,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  makeStyles,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { useSelector } from 'react-redux';
import { LayersCategoryType } from 'config/types';
import MenuSwitch from 'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { filterActiveLayers } from 'components/MapView/utils';
import SelectedLayersInformation from './SelectedLayersInformation';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
    },
    rootSummary: {
      backgroundColor: '#D8E9EC',
    },
    rootDetails: {
      padding: 0,
    },
    expandIcon: {
      color: '#53888F',
    },
    summaryContent: {
      alignItems: 'center',
    },
    title: {
      color: '#53888F',
      fontWeight: 600,
    },
  }),
);

interface MenuItemProps {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
  extent?: Extent;
}

const MenuItem = memo(({ title, layersCategories, extent }: MenuItemProps) => {
  const { t } = useSafeTranslation();
  const selectedLayers = useSelector(layersSelector);
  const classes = useStyles();

  const categoryLayers = layersCategories
    .map(layerCategory => {
      return layerCategory.layers;
    })
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
    <Accordion elevation={0} classes={{ root: classes.root }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        classes={{
          root: classes.rootSummary,
          expandIcon: classes.expandIcon,
          content: classes.summaryContent,
        }}
        aria-controls={title}
        id={title}
      >
        <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
        <SelectedLayersInformation
          selectedCategoryLayers={selectedCategoryLayers}
        />
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.rootDetails }}>
        <Grid container direction="column">
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
