import {
  Button,
  createStyles,
  Divider,
  Grid,
  Hidden,
  List,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import React, { useState, memo, useMemo, useCallback } from 'react';

import { createGetLegendGraphicUrl } from 'prism-common';
import { useSelector } from 'react-redux';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from 'context/analysisResultStateSlice';
import { LayerType } from 'config/types';
import { BaselineLayerResult } from 'utils/analysis-utils';
import { useSafeTranslation } from 'i18n';

import AnalysisDownloadButton from './AnalysisDownloadButton';
import LegendItem from './LegendItem';
import LegendImpactResult from './LegendImpactResult';

const Legends = memo(({ classes, layers }: LegendsProps) => {
  // Selectors
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const analysisLayerOpacity = useSelector(analysisResultOpacitySelector);

  // State
  const [open, setOpen] = useState(true);

  // memoized values from selectors
  const featureCollection = useMemo(() => {
    return analysisResult?.featureCollection;
  }, [analysisResult]);

  const hasData = useMemo(() => {
    return featureCollection?.features
      ? featureCollection.features.length > 0
      : false;
  }, [featureCollection]);

  const { t } = useSafeTranslation();

  // If legend array is empty, we fetch from remote server the legend as GetLegendGraphic request.
  const getLayerLegendUrl = useCallback((layer: LayerType) => {
    return layer.type === 'wms' && layer.legend.length === 0
      ? createGetLegendGraphicUrl({
          base: layer.baseUrl,
          layer: layer.serverLayerName,
        })
      : undefined;
  }, []);

  const layersLegendItems = useMemo(() => {
    return layers.map(layer => {
      if (!layer.legend || !layer.legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }
      return (
        <LegendItem
          key={layer.id}
          id={layer.id}
          title={layer.title ? t(layer.title) : undefined}
          legend={layer.legend}
          legendUrl={getLayerLegendUrl(layer)}
          type={layer.type}
          opacity={layer.opacity}
          fillPattern={layer.fillPattern}
        >
          {t(layer.legendText)}
        </LegendItem>
      );
    });
  }, [getLayerLegendUrl, layers, t]);

  const renderedLegendImpactResult = useMemo(() => {
    if (!(analysisResult instanceof BaselineLayerResult)) {
      return null;
    }
    const baselineLayer = analysisResult.getBaselineLayer();
    const hazardLayer = analysisResult.getHazardLayer();
    return (
      <LegendImpactResult
        legendText={
          baselineLayer.legendText
            ? baselineLayer.legendText
            : hazardLayer.legendText
        }
        thresholdBelow={analysisResult.threshold.below}
        thresholdAbove={analysisResult.threshold.above}
      />
    );
  }, [analysisResult]);

  // add analysis legend item if layer is active and analysis result exists
  const analysisLegendItem = useMemo(() => {
    if (!isAnalysisLayerActive || !hasData) {
      return [];
    }
    return [
      <LegendItem
        key={analysisResult?.key ?? Date.now()}
        legend={analysisResult?.legend}
        title={analysisResult?.getTitle(t)}
        opacity={analysisLayerOpacity} // TODO: initial opacity value
        // Control opacity only for analysis
        // for the other layers it is controlled from the left panel
        displayOpacitySlider={isAnalysisLayerActive && hasData}
      >
        {renderedLegendImpactResult}
        <Divider />
        <Grid item>
          <AnalysisDownloadButton />
        </Grid>
      </LegendItem>,
    ];
  }, [
    analysisLayerOpacity,
    analysisResult,
    hasData,
    isAnalysisLayerActive,
    renderedLegendImpactResult,
    t,
  ]);

  const legendItems = useMemo(() => {
    return [...layersLegendItems, ...analysisLegendItem];
  }, [analysisLegendItem, layersLegendItems]);

  const renderedVisibilityButton = useMemo(() => {
    if (open) {
      return <VisibilityOff fontSize="small" />;
    }
    return <Visibility fontSize="small" />;
  }, [open]);

  const renderedLegendItemsList = useMemo(() => {
    if (!open) {
      return null;
    }
    return <List className={classes.list}>{legendItems}</List>;
  }, [classes.list, legendItems, open]);

  const toggleLegendVisibility = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <Grid item className={classes.container}>
      <Button
        className={classes.triggerButton}
        variant="contained"
        color="primary"
        onClick={toggleLegendVisibility}
      >
        {renderedVisibilityButton}
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            {t('Legend')}
          </Typography>
        </Hidden>
      </Button>
      {renderedLegendItemsList}
    </Grid>
  );
});

const styles = () =>
  createStyles({
    container: {
      textAlign: 'right',
    },
    triggerButton: {
      height: '3em',
    },
    label: {
      marginLeft: '10px',
    },
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '70vh',
      position: 'absolute',
      right: '16px',
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
}

export default withStyles(styles)(Legends);
