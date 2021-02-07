import React, { PropsWithChildren, useState, useEffect } from 'react';
import {
  Box,
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
  Button,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { useDispatch, useSelector } from 'react-redux';
import { setFormInputValue } from '../../../context/mapStateSlice';
import {
  mapSelector,
  layerFormSelector,
} from '../../../context/mapStateSlice/selectors';
import ColorIndicator from './ColorIndicator';
import { LayerFormInput, LayerType } from '../../../config/types';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';

function Legends({ classes, layers }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const analysisResult = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const legendItems = [
    ...layers.map(({ id, title, legend, legendText, type, opacity }) => {
      if (!legend || !legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }
      return (
        <LegendItem
          classes={classes}
          key={title}
          id={id}
          title={title}
          legend={legend}
          type={type}
          opacity={opacity}
        >
          {legendText}
        </LegendItem>
      );
    }),
    // add analysis legend item if layer is active and analysis result exists
    ...(isAnalysisLayerActive && analysisResult
      ? [
          <LegendItem
            key={analysisResult.key}
            legend={analysisResult.legend}
            title={`${analysisResult.getBaselineLayer().title} exposed to ${
              analysisResult.getHazardLayer().title
            }`}
            classes={classes}
          >
            Impact Analysis on {analysisResult.getBaselineLayer().legendText}
            <br />
            {analysisResult.threshold.above
              ? `Above Threshold: ${analysisResult.threshold.above}`
              : ''}
            <br />
            {analysisResult.threshold.below
              ? `Below Threshold: ${analysisResult.threshold.below}`
              : ''}
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
        <FontAwesomeIcon
          style={{ fontSize: '1em' }}
          icon={open ? faEyeSlash : faEye}
        />
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Legend
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
}: LegendItemProps) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const form = useSelector(layerFormSelector(id));
  const [opacity, setOpacityValue] = useState<number | number[]>(
    initialOpacity || 0,
  );

  const handleChangeOpacity = (event: object, newValue: number | number[]) => {
    setOpacityValue(newValue);
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

  useEffect(() => {
    if (type === 'wms') {
      map!.setPaintProperty(`layer-${id}`, 'raster-opacity', opacity);
    }
  });

  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid container direction="column" spacing={1}>
          <Grid item>
            <Typography variant="h4">{title}</Typography>
          </Grid>

          <Divider />
          {type === 'wms' && (
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
          )}
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
              {legend.map(({ value, color }: any) => (
                <ColorIndicator
                  key={value}
                  value={value as string}
                  color={color as string}
                  opacity={opacity as number}
                />
              ))}
            </Grid>
          )}

          <Divider />

          {children && (
            <Grid item>
              <Typography variant="h5">{children}</Typography>
            </Grid>
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
      overflow: 'auto',
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
}

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  id?: LayerType['id'];
  title: LayerType['title'];
  legend: LayerType['legend'];
  type?: LayerType['type'];
  opacity?: LayerType['opacity'];
}

export default withStyles(styles)(Legends);
