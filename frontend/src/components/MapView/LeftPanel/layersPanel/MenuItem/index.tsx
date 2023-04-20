import React, { memo, useMemo } from 'react';
import {
  createStyles,
  Grid,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  makeStyles,
  Chip,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import { LayersCategoryType } from '../../../../../config/types';
import MenuSwitch from '../MenuSwitch';
import { useSafeTranslation } from '../../../../../i18n';
import { Extent } from '../../../Layers/raster-utils';
import { layersSelector } from '../../../../../context/mapStateSlice/selectors';

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
    chipRoot: {
      marginLeft: '3%',
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

  const categoryLayers = useMemo(() => {
    return layersCategories
      .map(layerCategory => {
        return layerCategory.layers;
      })
      .flat();
  }, [layersCategories]);

  const selectedCategoryLayers = useMemo(() => {
    return selectedLayers.filter(layer => {
      return categoryLayers.some(categoryLayer => {
        return isEqual(categoryLayer, layer);
      });
    });
  }, [categoryLayers, selectedLayers]);

  const renderedMenuSwitches = useMemo(() => {
    return layersCategories.map((layerCategory: LayersCategoryType) => (
      <MenuSwitch
        key={layerCategory.title}
        title={layerCategory.title}
        layers={layerCategory.layers}
        tables={layerCategory.tables}
        extent={extent}
      />
    ));
  }, [extent, layersCategories]);

  const renderedSelectedLayerLabel = useMemo(() => {
    return selectedCategoryLayers.length === 1
      ? `${selectedCategoryLayers.length} ${t('Active Layer')}`
      : `${selectedCategoryLayers.length} ${t('Active Layers')}`;
  }, [selectedCategoryLayers.length, t]);

  const renderedSelectedLayerInformation = useMemo(() => {
    if (!selectedCategoryLayers.length) {
      return null;
    }
    return (
      <Chip
        classes={{ root: classes.chipRoot }}
        color="secondary"
        label={renderedSelectedLayerLabel}
      />
    );
  }, [
    classes.chipRoot,
    renderedSelectedLayerLabel,
    selectedCategoryLayers.length,
  ]);

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
        {renderedSelectedLayerInformation}
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.rootDetails }}>
        <Grid container direction="column">
          {renderedMenuSwitches}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
});

export default MenuItem;
