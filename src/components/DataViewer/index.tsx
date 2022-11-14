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
  AdminBoundaryParams,
  EWSParams,
  DatasetRequestParams,
  CHART_DATA_PREFIXES,
} from '../../context/datasetStateSlice';
import { dateRangeSelector } from '../../context/mapStateSlice/selectors';
import Chart from '../DataDrawer/Chart';
import { ChartConfig } from '../../config/types';
import { useSafeTranslation } from '../../i18n';

const isAdminBoundary = (
  params: AdminBoundaryParams | EWSParams,
): params is AdminBoundaryParams =>
  (params as AdminBoundaryParams).id !== undefined;

function DataViewer({ classes }: DatasetProps) {
  const dispatch = useDispatch();
  const isDatasetLoading = useSelector(loadingDatasetSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const { t } = useSafeTranslation();

  const {
    data: dataset,
    datasetParams: params,
    title,
    chartType,
  } = useSelector(datasetSelector);

  useEffect(() => {
    if (!params || !selectedDate) {
      return;
    }

    const requestParams: DatasetRequestParams = isAdminBoundary(params)
      ? {
          id: params.id,
          boundaryProps: params.boundaryProps,
          url: params.url,
          serverLayerName: params.serverLayerName,
          datasetFields: params.datasetFields,
          selectedDate,
        }
      : {
          date: selectedDate,
          externalId: params.externalId,
          triggerLevels: params.triggerLevels,
          baseUrl: params.baseUrl,
        };

    dispatch(loadDataset(requestParams));
  }, [params, dispatch, selectedDate]);

  if (!params) {
    return null;
  }

  const colors = isAdminBoundary(params)
    ? params.datasetFields?.map(row => row.color)
    : undefined;

  const config: ChartConfig = {
    type: chartType,
    stacked: false,
    category: CHART_DATA_PREFIXES.date,
    data: CHART_DATA_PREFIXES.col,
    transpose: true,
    displayLegend: isAdminBoundary(params),
    colors,
  };

  const adminBoundaryLevelButtons = isAdminBoundary(params)
    ? Object.entries(params.boundaryProps).map(([adminId, level]) => (
        <Button
          id={adminId}
          className={classes.adminButton}
          onClick={() => dispatch(updateAdminId(adminId))}
          size="small"
          color="primary"
          variant={params.id === adminId ? 'contained' : 'text'}
        >
          {level.name}
        </Button>
      ))
    : null;

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
            dataset && (
              <Chart
                title={t(title)}
                config={config}
                data={dataset}
                xAxisLabel={
                  isAdminBoundary(params)
                    ? undefined
                    : t('Timestamps reflect local time in Cambodia')
                }
              />
            )
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
