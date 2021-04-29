import React, { PropsWithChildren, useState } from 'react';
import {
  createStyles,
  Divider,
  Grid,
  Hidden,
  List,
  ListItem,
  Paper,
  Typography,
  WithStyles,
  withStyles,
  Button,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import { useSelector } from 'react-redux';
import ColorIndicator from './ColorIndicator';
import { LayerType } from '../../../config/types';
import { formatWMSLegendUrl } from '../../../utils/server-utils';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';

function Legends({ classes, layers }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const analysisResult = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

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

      return (
        <LegendItem
          classes={classes}
          key={layer.title}
          title={layer.title}
          legend={layer.legend}
          legendUrl={legendUrl}
        >
          {layer.legendText}
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
        {open ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
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
  title,
  legend,
  children,
  legendUrl,
}: LegendItemProps) {
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
              {legendUrl ? (
                <img src={legendUrl} alt={title} />
              ) : (
                legend.map(({ value, color }: any) => (
                  <ColorIndicator
                    key={value}
                    value={value as string}
                    color={color as string}
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
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
}

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  title: LayerType['title'];
  legend: LayerType['legend'];
  legendUrl?: string;
}

export default withStyles(styles)(Legends);
