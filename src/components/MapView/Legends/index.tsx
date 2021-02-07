import React, { PropsWithChildren, useState } from 'react';
import {
  createStyles,
  Button,
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
// import {
//   dateRangeSelector,
//   layerDataSelector,
// } from '../../../context/mapStateSlice/selectors';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';
// import { AnalysisResult } from '../../../utils/analysis-utils';
// import { LayerDataTypes } from '../../../context/layers/layer-data';

function Legends({ classes, layers }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const analysisResult = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const legendItems = [
    ...layers.map(({ id, type, title, legend, legendText }) => {
      if (!legend || !legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }
      return (
        <LegendItem
          classes={classes}
          key={title}
          id={id}
          layerType={type}
          title={title}
          legend={legend}
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
    <div className={classes.container}>
      <button type="button" onClick={() => setOpen(!open)}>
        <FontAwesomeIcon icon={open ? faEyeSlash : faEye} /> Legend
      </button>

      {open && <List className={classes.list}>{legendItems}</List>}
    </div>
  );
}

/* tslint:disable */

function LegendItem({
  classes,
  id,
  layerType,
  title,
  legend,
  children,
}: LegendItemProps) {
  const handleDownload = () => {
    // const { startDate: selectedDate } = useSelector(dateRangeSelector);
    console.info(id);

    switch (layerType) {
      case 'nso':
        // get datalayer using layerDataSelector
        // dataLayer = layerDataSelector(id || 'disabled');
        // get data from store using dataLayer based on the layer type
        // const data = useSelector(dataLayer);
        // transform data and export in required format
        break;
      case 'wms':
        // get datalayer by forming a url using getWMSUrl and passing necessary layer args
        // using baseUrl and other parameters we can query tiles and merge them as geotiff
        // not having the API documentation left me in the blank here
        break;
      case 'impact':
        // get datalayer using layerDataSelector and using selected data
        // dataLayer = layerDataSelector(id || 'disabled', selectedDate);
        // get data from store using dataLayer based on the layer type
        // const data = useSelector(dataLayer);
        // transform data and export in required format
        break;
      case 'point_data':
        // get datalayer using layerDataSelector and using selected data
        // dataLayer = layerDataSelector(id || 'disabled', selectedDate);
        // get data from store using dataLayer based on the layer type
        // const data = useSelector(dataLayer);
        // transform data and export in required format
        break;
      default:
        // Handle unsupported layer types
        break;
    }
  };
  /* tslint:enable */

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

          {children && (
            <Grid item>
              <Typography variant="h5">{children}</Typography>
            </Grid>
          )}

          <Divider />

          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDownload}
            >
              <Typography variant="body2">Download Data</Typography>
            </Button>
          </Grid>
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

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  id?: LayerType['id'];
  layerType?: LayerType['type'];
  title: LayerType['title'];
  legend: LayerType['legend'];
}

export default withStyles(styles)(Legends);
