import {
  Box,
  Button,
  createStyles,
  Divider,
  FormControl,
  Grid,
  Hidden,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Slider,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import React, { PropsWithChildren, useState } from 'react';

import { createGetLegendGraphicUrl } from 'prism-common';
import { useDispatch, useSelector } from 'react-redux';
import {
  ExposedPopulationDefinition,
  LayerFormInput,
  LayerType,
  LegendDefinitionItem,
} from '../../../config/types';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';
import { setFormInputValue } from '../../../context/mapStateSlice';
import {
  mapSelector,
  layerFormSelector,
} from '../../../context/mapStateSlice/selectors';
import { Extent } from '../Layers/raster-utils';
import ColorIndicator from './ColorIndicator';
import LoadingBar from './LoadingBar';

import {
  BaselineLayerResult,
  ExposedPopulationResult,
} from '../../../utils/analysis-utils';
import { getLegendItemLabel } from '../utils';

import { useSafeTranslation } from '../../../i18n';
import ExposedPopulationAnalysis from './exposedPopulationAnalysis';
import LayerContentPreview from './layerContentPreview';
import AnalysisDownloadButton from './AnalysisDownloadButton';
import AdminLevelDataDownloadButton from './AdminLevelDataDownloadButton';
/**
 * Returns layer identifier used to perform exposure analysis.
 *
 * @return LayerKey or undefined if exposure not found or GeometryType is not Polygon.
 */
function GetExposureFromLayer(
  layer: LayerType,
): ExposedPopulationDefinition | undefined {
  return (layer.type === 'wms' && layer.exposure) || undefined;
}

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

function Legends({ classes, layers, extent }: LegendsProps) {
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

      const exposure = GetExposureFromLayer(layer);

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
          exposure={exposure}
          extent={extent}
        >
          {t(layer.legendText)}
          {layer.type === 'admin_level_data' && (
            <>
              <Divider />
              <Grid item>
                <AdminLevelDataDownloadButton layer={layer} />
              </Grid>
            </>
          )}
        </LegendItem>
      );
    }),
    // add analysis legend item if layer is active and analysis result exists
    ...(isAnalysisLayerActive && hasData
      ? [
          <LegendItem
            key={analysisResult?.key}
            legend={analysisResult?.legend}
            title={analysisResult?.getTitle(t)}
            classes={classes}
            opacity={0.5} // TODO: initial opacity value
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
  exposure,
  extent,
}: LegendItemProps) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const form = useSelector(layerFormSelector(id));
  const analysisResult = useSelector(analysisResultSelector);

  const [opacity, setOpacityValue] = useState<number | number[]>(
    initialOpacity || 0,
  );

  const handleChangeOpacity = (
    event: React.ChangeEvent<{}>,
    newValue: number | number[],
  ) => {
    // TODO: temporary solution for opacity adjustment, we hope to edit react-mapbox in the future to support changing props
    // because the whole map will be re-rendered if using state directly
    if (map) {
      const [layerId, opacityType] = ((
        layerType?: LayerType['type'],
      ): [string, string] => {
        switch (layerType) {
          case 'wms':
            return [`layer-${id}`, 'raster-opacity'];
          case 'impact':
          case 'admin_level_data':
            return [`layer-${id}-fill`, 'fill-opacity'];
          case 'point_data':
            return [`layer-${id}-circle`, 'circle-opacity'];
          // analysis layer type is undefined TODO we should try make analysis a layer to remove edge cases like this
          case undefined:
            return ['layer-analysis-fill', 'fill-opacity'];
          default:
            throw new Error('Unknown map layer type');
        }
      })(type);

      map.setPaintProperty(layerId, opacityType, newValue);
      setOpacityValue(newValue);
    }
  };

  const handleChangeFormInput = (event: any, input: LayerFormInput) => {
    const { value } = event.target;
    dispatch(
      setFormInputValue({
        layerId: id!,
        inputId: input.id,
        value,
      }),
    );
  };

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
        <Grid item className={classes.slider}>
          <Box px={1}>
            <Slider
              value={opacity}
              step={0.01}
              min={0}
              max={1}
              aria-labelledby="opacity-slider"
              onChange={handleChangeOpacity}
            />
          </Box>
        </Grid>

        {form &&
          form.inputs.map(input => {
            return (
              <Grid key={input.id} item>
                <Typography variant="h4">{input.label}</Typography>
                <FormControl>
                  <Select
                    className={classes.select}
                    value={input.value}
                    onChange={e => handleChangeFormInput(e, input)}
                  >
                    {input.values.map(v => (
                      <MenuItem key={v.value} value={v.value}>
                        {v.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            );
          })}

        {legend && (
          <Grid item>
            {legendUrl ? (
              <img src={legendUrl} alt={title} />
            ) : (
              legend.map((item: LegendDefinitionItem) => (
                <ColorIndicator
                  key={item.value || item.label}
                  value={getLegendItemLabel(item)}
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

        {exposure && (
          <ExposedPopulationAnalysis
            result={analysisResult as ExposedPopulationResult}
            id={id!}
            extent={extent!}
            exposure={exposure}
          />
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
    select: {
      color: '#333',
    },
    slider: {
      padding: '0 5px',
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
  extent?: Extent;
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
  exposure?: ExposedPopulationDefinition;
  extent?: Extent;
}

export default withStyles(styles)(Legends);
