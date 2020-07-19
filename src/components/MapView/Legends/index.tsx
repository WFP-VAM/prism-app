import React, { useState } from 'react';
import {
  createStyles,
  Divider,
  Grid,
  List,
  ListItem,
  Paper,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import { useSelector } from 'react-redux';
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
    ...layers.map(({ title, legend, legendText }) => {
      if (!legend || !legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }
      return (
        <LegendItem
          classes={classes}
          key={title}
          title={title}
          legend={legend}
          legendText={legendText}
        />
      );
    }),
    // add analysis legend item if layer is active and analysis result exists
    ...(isAnalysisLayerActive && analysisResult
      ? [
          <LegendItem
            key={analysisResult.key}
            legendText={`Impact Analysis on the effect of ${
              analysisResult.getHazardLayer().title
            } with the ongoing effects of ${
              analysisResult.getBaselineLayer().title
            }`}
            legend={analysisResult.legend}
            title="Analysis Layer"
            classes={classes}
          />,
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

function LegendItem({ classes, title, legend, legendText }: LegendItemProps) {
  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid container direction="column" spacing={1}>
          <Grid item>
            <Typography variant="h4">{title}</Typography>
          </Grid>

          <Divider />

          {legend && (
            <Grid item>
              {legend.map(({ value, color }: any) => (
                <ColorIndicator
                  key={value}
                  value={value as string}
                  color={color as string}
                />
              ))}
            </Grid>
          )}

          <Divider />

          {legendText && (
            <Grid item>
              <Typography variant="h5">{legendText}</Typography>
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
      overflow: 'auto',
      maxHeight: '70vh',
    },
    paper: {
      padding: 8,
      width: 180,
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
}

interface LegendItemProps extends WithStyles<typeof styles> {
  title: LayerType['title'];
  legend: LayerType['legend'];
  legendText: LayerType['legendText'];
}

export default withStyles(styles)(Legends);
