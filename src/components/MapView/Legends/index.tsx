import React, { PropsWithChildren, useState } from 'react';
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
  Slider,
  Select,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';

import { useDispatch, useSelector } from 'react-redux';
import { Extent } from '../Layers/raster-utils';
import ColorIndicator from './ColorIndicator';
import { uiLabel } from '../../../config';
import {
  LayerFormInput,
  LayerType,
  GeometryType,
  ExposedPopulationDefinition,
  LegendDefinitionItem,
} from '../../../config/types';
import { formatWMSLegendUrl } from '../../../utils/server-utils';
import { setFormInputValue } from '../../../context/mapStateSlice';
import {
  mapSelector,
  layerFormSelector,
} from '../../../context/mapStateSlice/selectors';
import {
  addTableData,
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';

import {
  BaselineLayerResult,
  ExposedPopulationResult,
} from '../../../utils/analysis-utils';
import { convertToTableData, downloadToFile } from '../utils';

import ExposedPopulationAnalysis from './exposedPopulationAnalysis';
import LayerContentPreview from './layerContentPreview';

/**
 * Returns layer identifier used to perform exposure analysis.
 *
 * @return LayerKey or undefined if exposure not found or GeometryType is not Polygon.
 */
function GetExposureFromLayer(
  layer: LayerType,
): ExposedPopulationDefinition | undefined {
  return layer.type === 'wms' &&
    layer.exposure &&
    layer.geometry === GeometryType.Polygon
    ? layer.exposure
    : undefined;
}

function LegendImpactResult({ result }: { result: BaselineLayerResult }) {
  return (
    <>
      Impact Analysis on {result.getBaselineLayer().legendText}
      <br />
      {result.threshold.above
        ? `Above Threshold: ${result.threshold.above}`
        : ''}
      <br />
      {result.threshold.below
        ? `Below Threshold: ${result.threshold.below}`
        : ''}
    </>
  );
}

function Legends({ classes, layers, extent }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const features = analysisResult?.featureCollection.features;
  const hasData = features ? features.length > 0 : false;

  const handleAnalysisDownload = (e: React.ChangeEvent<{}>): void => {
    e.preventDefault();
    downloadToFile(
      {
        content: JSON.stringify(features),
        isUrl: false,
      },
      analysisResult ? analysisResult.getTitle() : '',
      'application/json',
    );
  };

  const legendItems = [
    ...layers.map(layer => {
      if (!layer.legend || !layer.legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }

      // If legend array is empty, we fetch from remote server the legend as GetLegendGraphic request.
      const legendUrl =
        layer.type === 'wms' && layer.legend.length === 0
          ? formatWMSLegendUrl(layer.baseUrl, layer.serverLayerName)
          : undefined;

      const exposure = GetExposureFromLayer(layer);

      return (
        <LegendItem
          classes={classes}
          key={layer.title}
          id={layer.id}
          title={layer.title}
          legend={layer.legend}
          legendUrl={legendUrl}
          type={layer.type}
          opacity={layer.opacity}
          exposure={exposure}
          extent={extent}
        >
          {layer.legendText}
        </LegendItem>
      );
    }),
    // add analysis legend item if layer is active and analysis result exists
    ...(isAnalysisLayerActive && hasData
      ? [
          <LegendItem
            key={analysisResult?.key}
            legend={analysisResult?.legend}
            title={analysisResult?.getTitle()}
            classes={classes}
            opacity={0.5} // TODO: initial opacity value
          >
            {analysisResult instanceof BaselineLayerResult && (
              <LegendImpactResult result={analysisResult} />
            )}
            <Divider />
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={e => handleAnalysisDownload(e)}
                fullWidth
              >
                Download
              </Button>
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
            {uiLabel('legend', 'Legend')}
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
  const map = useSelector(mapSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const dispatch = useDispatch();

  const form = useSelector(layerFormSelector(id));

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

  if (analysisResult instanceof ExposedPopulationResult) {
    const tableData = convertToTableData(analysisResult);
    dispatch(addTableData(tableData));
  }

  const legendItemLabel = ({ label, value }: LegendDefinitionItem) => {
    if (typeof label === 'string') {
      return label;
    }
    if (typeof value === 'number') {
      return Math.round(value).toLocaleString('en-US');
    }
    return value;
  };

  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid container direction="column" spacing={1}>
          <Grid item style={{ display: 'flex' }}>
            <Typography
              style={{ flexGrow: 1, fontWeight: 'bold' }}
              variant="h5"
            >
              {title}
            </Typography>
            <LayerContentPreview layerId={id} />
          </Grid>
          <Divider />
          <Grid item>
            <Box>
              <Slider
                className={classes.slider}
                value={opacity}
                step={0.01}
                min={0}
                max={1}
                aria-labelledby="opacity-slider"
                onChange={handleChangeOpacity}
              />
            </Box>
          </Grid>
          <Divider />

          {form &&
            form.inputs.map(input => {
              return (
                <Grid key={input.id} item>
                  <Typography variant="h5">{input.label}</Typography>
                  <FormControl fullWidth>
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
                    key={item.value}
                    value={legendItemLabel(item)}
                    color={item.color as string}
                    opacity={opacity as number}
                  />
                ))
              )}
            </Grid>
          )}

          <Divider />

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
        </Grid>
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
      right: 16,
      scrollbarWidth: 'thin',
    },
    select: {
      color: '#333',
      fontSize: 12,
    },
    paper: {
      padding: 8,
      width: 150,
    },
    slider: {
      padding: '5px 0',
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
