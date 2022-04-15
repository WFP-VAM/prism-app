import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createStyles,
  Theme,
  Grid,
  Paper,
  WithStyles,
  withStyles,
  IconButton,
  Button,
  CircularProgress,
} from '@material-ui/core';
import { Close } from '@material-ui/icons';
import {
  DatasetSelector,
  loadingDatasetSelector,
  clearDataset,
  loadDataset,
  DatasetParams,
} from '../../context/datasetStateSlice';
import Chart from '../DataDrawer/Chart';
import { ChartConfig } from '../../config/types';

function DataViewer({ classes }: DatasetProps) {
  const dispatch = useDispatch();
  const isDatasetLoading = useSelector(loadingDatasetSelector);

  const { data: dataset, boundaryProps, id, serverParams, title } = useSelector(
    DatasetSelector,
  );

  if (!boundaryProps || !dataset || !serverParams || !title || !id) {
    return null;
  }

  const config: ChartConfig = {
    type: 'line',
    stacked: false,
    fill: false,
    category: id,
  };

  const updateChart = (adminId: string) => {
    const datasetParams: DatasetParams = {
      id: adminId,
      boundaryProps,
      url: serverParams.url,
      serverLayerName: serverParams.layerName,
    };

    dispatch(loadDataset(datasetParams));
  };

  const boundaryButtons = Object.entries(boundaryProps).map(
    ([adminId, level]) => (
      <Button
        id={adminId}
        className={classes.adminButton}
        onClick={() => updateChart(adminId)}
        size="small"
        color="primary"
        variant={id === adminId ? 'contained' : 'text'}
      >
        {level.name}
      </Button>
    ),
  );

  return (
    <>
      <Grid item className={classes.container}>
        <Paper className={classes.paper}>
          <IconButton size="small" onClick={() => dispatch(clearDataset())}>
            <Close fontSize="small" />
          </IconButton>
          <Grid item className={classes.boundarySelector}>
            {boundaryButtons}
          </Grid>
          {isDatasetLoading ? (
            <div className={classes.loading}>
              <CircularProgress size={50} />
            </div>
          ) : (
            <Chart title={title} config={config} data={dataset} />
          )}
        </Paper>
      </Grid>
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    container: {
      textAlign: 'right',
      marginTop: 8,
      zIndex: 9999,
    },
    boundarySelector: {
      display: 'flex',
    },
    adminButton: {
      marginRight: '1em',
    },
    paper: {
      padding: 8,
      width: 480,
    },
    title: {
      color: theme.palette.text.secondary,
    },
    loading: {
      height: 240,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export interface DatasetProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(DataViewer);
