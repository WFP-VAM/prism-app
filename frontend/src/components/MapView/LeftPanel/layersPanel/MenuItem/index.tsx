import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import { LayersCategoryType } from 'config/types';
import MenuSwitch from 'components/MapView/LeftPanel/layersPanel/MenuSwitch';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { filterActiveLayers } from 'components/MapView/utils';

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
        return filterActiveLayers(layer, categoryLayer);
      });
    });
  }, [categoryLayers, selectedLayers]);

  const [informationChipLabel, setInformationChipLabel] = useState<string>(
    selectedCategoryLayers.length.toString(),
  );

  useEffect(() => {
    if (!selectedCategoryLayers.length) {
      return;
    }
    setInformationChipLabel(selectedCategoryLayers.length.toString());
  }, [selectedCategoryLayers.length]);

  const renderedMenuSwitches = useMemo(() => {
    return layersCategories.map((layerCategory: LayersCategoryType) => (
      <MenuSwitch
        key={layerCategory.title}
        title={layerCategory.title}
        layers={layerCategory.layers}
        extent={extent}
      />
    ));
  }, [extent, layersCategories]);

  const handleChipOnMouseEnter = useCallback(() => {
    setInformationChipLabel(
      `${selectedCategoryLayers.length} ${t('Active Layer(s)')}`,
    );
  }, [selectedCategoryLayers.length, t]);

  const handleChipOnMouseLeave = useCallback(() => {
    setInformationChipLabel(selectedCategoryLayers.length.toString());
  }, [selectedCategoryLayers.length]);

  const renderedSelectedLayerInformation = useMemo(() => {
    if (!selectedCategoryLayers.length) {
      return null;
    }
    return (
      <Chip
        onMouseEnter={handleChipOnMouseEnter}
        onMouseLeave={handleChipOnMouseLeave}
        classes={{ root: classes.chipRoot }}
        color="secondary"
        label={informationChipLabel}
      />
    );
  }, [
    classes.chipRoot,
    handleChipOnMouseEnter,
    handleChipOnMouseLeave,
    informationChipLabel,
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
