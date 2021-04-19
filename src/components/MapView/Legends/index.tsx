import React, { PropsWithChildren, useState } from 'react';
import {
  Box,
  createStyles,
  Divider,
  Grid,
  List,
  ListItem,
  Paper,
  Slider,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import { updateLayerOpacity } from '../../../context/mapStateSlice';
import ColorIndicator from './ColorIndicator';
import { LayerType } from '../../../config/types';
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
            opacity={0.3} // initial opacity value
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
    <div className={classes.container}>
      <button type="button" onClick={() => setOpen(!open)}>
        <FontAwesomeIcon icon={open ? faEyeSlash : faEye} /> Legend
      </button>

      {open && <List className={classes.list}>{legendItems}</List>}
    </div>
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
  const [opacity, setOpacityValue] = useState<number | number[]>(
    initialOpacity || 0,
  );

  const handleChangeOpacity = (
    event: React.ChangeEvent<{}>,
    newValue: number | number[],
  ) => {
    if (id) {
      if (map && type === 'wms') {
        map.setPaintProperty(`layer-${id}`, 'raster-opacity', newValue);
      } else {
        dispatch(updateLayerOpacity({ id, opacity: newValue as number }));
      }
      setOpacityValue(newValue);
    }
  };

  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid container direction="column" spacing={1}>
          <Grid item style={{ display: 'flex' }}>
            <Typography style={{ flexGrow: 1 }} variant="h4">
              {title}
            </Typography>
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
          {legend && (
            <Grid item>
              {legend.map(({ value, color }) => (
                <ColorIndicator
                  key={value}
                  value={value as string}
                  color={color}
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

const styles = (theme: Theme) =>
  createStyles({
    container: {
      zIndex: theme.zIndex.drawer,
      position: 'absolute',
      top: 24,
      right: 24,
      textAlign: 'right',
    },
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '70vh',
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
  type?: LayerType['type'];
  opacity: LayerType['opacity'];
}

export default withStyles(styles)(Legends);
