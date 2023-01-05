import {
  CircularProgress,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';
import React, { useEffect, useMemo, useState } from 'react';
import { ChartConfig, WMSLayerProps } from '../../../../../config/types';
import {
  CHART_DATA_PREFIXES,
  DatasetRequestParams,
  loadAdminBoundaryDataset,
} from '../../../../../context/datasetStateSlice';
import { TableData } from '../../../../../context/tableStateSlice';
import { useSafeTranslation } from '../../../../../i18n';
import { getChartAdminBoundaryParams } from '../../../../../utils/admin-utils';
import Chart from '../../../../DataDrawer/Chart';

function ChartSection({
  chartLayer,
  adminProperties,
  date,
  classes,
}: ChartSectionProps) {
  const { t } = useSafeTranslation();
  const [chartDataset, setChartDataset] = useState<undefined | TableData>();

  const params = useMemo(
    () =>
      getChartAdminBoundaryParams(
        chartLayer,
        adminProperties as { [key: string]: any },
      ),
    [chartLayer, adminProperties],
  );

  useEffect(() => {
    const requestParams: DatasetRequestParams = {
      id: params.id,
      boundaryProps: params.boundaryProps,
      url: params.url,
      serverLayerName: params.serverLayerName,
      datasetFields: params.datasetFields,
      selectedDate: date,
    };

    const getData = async () => {
      const results = await loadAdminBoundaryDataset(requestParams);
      setChartDataset(results);
    };

    getData();
  }, [
    adminProperties,
    date,
    params.boundaryProps,
    params.datasetFields,
    params.id,
    params.serverLayerName,
    params.url,
  ]);

  const { title } = chartLayer;
  const chartType = chartLayer.chartData!.type;
  const colors = params.datasetFields?.map(row => row.color);

  const config: ChartConfig = {
    type: chartType,
    stacked: false,
    category: CHART_DATA_PREFIXES.date,
    data: CHART_DATA_PREFIXES.col,
    transpose: true,
    displayLegend: true,
    colors,
  };

  return (
    <>
      {!chartDataset ? (
        <div className={classes.loading}>
          <CircularProgress size={50} />
        </div>
      ) : (
        <Chart title={t(title)} config={config} data={chartDataset} />
      )}
    </>
  );
}

const styles = () =>
  createStyles({
    loading: {
      height: 240,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export interface ChartSectionProps extends WithStyles<typeof styles> {
  chartLayer: WMSLayerProps;
  adminProperties: GeoJsonProperties;
  date: number;
}

export default withStyles(styles)(ChartSection);
