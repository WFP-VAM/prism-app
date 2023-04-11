import {
  Box,
  Button,
  createStyles,
  Divider,
  Grid,
  Hidden,
  List,
  ListItem,
  Paper,
  Slider,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import React, { PropsWithChildren, useState } from 'react';

import { createGetLegendGraphicUrl } from 'prism-common';
import { useSelector } from 'react-redux';
import { LayerType, LegendDefinitionItem } from '../../../config/types';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import ColorIndicator from './ColorIndicator';
import LoadingBar from './LoadingBar';

import { BaselineLayerResult } from '../../../utils/analysis-utils';
import { getLegendItemLabel } from '../utils';

import { useSafeTranslation } from '../../../i18n';

import LayerContentPreview from './layerContentPreview';
import AnalysisDownloadButton from './AnalysisDownloadButton';
import { handleChangeOpacity } from './handleChangeOpacity';

function LegendImpactResult({ result }: { result: BaselineLayerResult }) {
  const { t } = useSafeTranslation();
  const baselineLayer = result.getBaselineLayer();
  const hazardLayer = result.getHazardLayer();
  return (
    <>
      {baselineLayer.legendText
        ? `${t('Impact Analysis on')}: ${t(baselineLayer.legendText)}`
        : t(hazardLayer.legendText)}
      <br />
      {result.threshold.above
        ? `${t('Above Threshold')}: ${result.threshold.above}`
        : ''}
      <br />
      {result.threshold.below
        ? `${t('Below Threshold')}: ${result.threshold.below}`
        : ''}
    </>
  );
}

function Legends({ classes, layers }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const featureCollection = analysisResult?.featureCollection;
  const hasData = featureCollection?.features
    ? featureCollection.features.length > 0
    : false;

  const { t } = useSafeTranslation();

  const legendItems = [
    ...layers.map(layer => {
      if (!layer.legend || !layer.legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }

      // If legend array is empty, we fetch from remote server the legend as GetLegendGraphic request.
      const legendUrl =
        layer.type === 'wms' && layer.legend.length === 0
          ? createGetLegendGraphicUrl({
              base: layer.baseUrl,
              layer: layer.serverLayerName,
            })
          : undefined;

      return (
        <LegendItem
          classes={classes}
          key={layer.id}
          id={layer.id}
          title={layer.title ? t(layer.title) : undefined}
          legend={layer.legend}
          legendUrl={legendUrl}
          type={layer.type}
          opacity={layer.opacity}
        >
          {t(layer.legendText)}
        </LegendItem>
      );
    }),
    // add analysis legend item if layer is active and analysis result exists
    ...(isAnalysisLayerActive && hasData
      ? [
          <LegendItem
            key={analysisResult?.key ?? Date.now()}
            legend={analysisResult?.legend}
            title={analysisResult?.getTitle(t)}
            classes={classes}
            opacity={0.5} // TODO: initial opacity value
            // Control opacity only for analysis
            // for the other layers it is controlled from the left panel
            displayOpacitySlider={isAnalysisLayerActive && hasData}
          >
            {analysisResult instanceof BaselineLayerResult && (
              <LegendImpactResult result={analysisResult} />
            )}
            <Divider />
            <Grid item>
              <AnalysisDownloadButton />
            </Grid>
          </LegendItem>,
        ]
      : []),
  ];

  return (
    <Grid item className={classes.container}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            {t('Legend')}
          </Typography>
        </Hidden>
      </Button>
      {open && <List className={classes.list}>{legendItems}</List>}
    </Grid>
  );
}

// Children here is legendText
function LegendItem({
  classes,
  id,
  title,
  legend,
  type,
  opacity: initialOpacity,
  children,
  legendUrl,
  displayOpacitySlider,
}: LegendItemProps) {
  const map = useSelector(mapSelector);
  const [opacity, setOpacityValue] = useState<number | number[]>(
    initialOpacity || 0,
  );

  const { t } = useSafeTranslation();

  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid item style={{ display: 'flex' }}>
          <Typography style={{ flexGrow: 1 }} variant="h4">
            {title}
          </Typography>
          <LayerContentPreview layerId={id} />
        </Grid>
        <Divider />
        {displayOpacitySlider && (
          <Grid item className={classes.slider}>
            <Box px={1}>
              <Slider
                value={opacity}
                step={0.01}
                min={0}
                max={1}
                aria-labelledby="opacity-slider"
                onChange={(e, newValue) =>
                  handleChangeOpacity(
                    e,
                    newValue as number,
                    map,
                    // TODO - get updated layer id in groups after switch. See issue #743
                    id,
                    type,
                    val => setOpacityValue(val),
                  )
                }
              />
            </Box>
          </Grid>
        )}

        {legend && (
          <Grid item>
            {legendUrl ? (
              <img src={legendUrl} alt={title} />
            ) : (
              legend.map((item: LegendDefinitionItem) => (
                <ColorIndicator
                  key={
                    item.value ||
                    (typeof item.label === 'string'
                      ? item?.label
                      : item?.label?.text)
                  }
                  value={getLegendItemLabel(t, item)}
                  color={item.color as string}
                  opacity={opacity as number}
                />
              ))
            )}
          </Grid>
        )}

        <LoadingBar layerId={id} />

        {children && (
          <Grid item>
            <Typography variant="h5">{children}</Typography>
          </Grid>
        )}
      </Paper>
    </ListItem>
  );
}

const styles = () =>
  createStyles({
    container: {
      textAlign: 'right',
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
    paper: {
      padding: 8,
      width: 180,
    },
    slider: {
      padding: '0 5px',
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
}

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  id?: LayerType['id'];
  title: LayerType['title'];
  legend: LayerType['legend'];
  legendUrl?: string;
  type?: LayerType['type'];
  opacity: LayerType['opacity'];
  displayOpacitySlider?: boolean;
}

export default withStyles(styles)(Legends);
