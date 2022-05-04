import React, { useEffect } from 'react';
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
  datasetSelector,
  loadingDatasetSelector,
  clearDataset,
  loadDataset,
  updateAdminId,
} from '../../context/datasetStateSlice';
import { dateRangeSelector } from '../../context/mapStateSlice/selectors';
import Chart from '../DataDrawer/Chart';
import { ChartConfig } from '../../config/types';

function DataViewer({ classes }: DatasetProps) {
  const dispatch = useDispatch();
  const isDatasetLoading = useSelector(loadingDatasetSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const { data: dataset, adminBoundaryParams: params, id } = useSelector(
    datasetSelector,
  );

  useEffect(() => {
    if (params && selectedDate && id) {
      dispatch(
        loadDataset({
          id,
          boundaryProps: params.boundaryProps,
          url: params.serverParams.url,
          serverLayerName: params.serverParams.layerName,
          selectedDate,
        }),
      );
    }
  }, [params, dispatch, selectedDate, id]);

  if (!params || !dataset || !id) {
    return null;
  }

  const { boundaryProps, title, chartType } = params;

  const config: ChartConfig = {
    type: chartType,
    stacked: false,
    fill: false,
    category: id,
  };

  const adminBoundaryLevelButtons = Object.entries(boundaryProps).map(
    ([adminId, level]) => (
      <Button
        id={adminId}
        className={classes.adminButton}
        onClick={() => dispatch(updateAdminId(adminId))}
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
            {adminBoundaryLevelButtons}
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
