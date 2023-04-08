import {
  CircularProgress,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';
import { omit } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { appConfig } from '../../../../../config';
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
  adminLevel,
  date,
  dataForCsv,
  classes,
}: ChartSectionProps) {
  const { t } = useSafeTranslation();
  const [chartDataset, setChartDataset] = useState<undefined | TableData>();
  const { levels } = chartLayer.chartData!;

  const levelsDict = Object.fromEntries(levels.map(x => [x.level, x.id]));

  const params = useMemo(
    () =>
      getChartAdminBoundaryParams(
        chartLayer,
        adminProperties as { [key: string]: any },
      ),
    [chartLayer, adminProperties],
  );

  const adminKey = levelsDict[adminLevel.toString()];
  // Default to country level data.
  const { code: adminCode } = useMemo(() => {
    return (
      params.boundaryProps[adminKey] || {
        code: appConfig.countryAdmin0Id,
      }
    );
  }, [adminKey, params.boundaryProps]);

  const requestParams: DatasetRequestParams = useMemo(() => {
    return {
      id: adminKey,
      level: adminLevel.toString(),
      adminCode: adminCode || appConfig.countryAdmin0Id,
      boundaryProps: params.boundaryProps,
      url: params.url,
      serverLayerName: params.serverLayerName,
      datasetFields: params.datasetFields,
      selectedDate: date,
    };
  }, [
    adminCode,
    adminKey,
    adminLevel,
    date,
    params.boundaryProps,
    params.datasetFields,
    params.serverLayerName,
    params.url,
  ]);

  const createDataKeyMap = useCallback(
    (results: TableData) => {
      return Object.fromEntries(
        Object.entries(results.rows[0]).map(([key, value]) => {
          const newKey = requestParams.datasetFields.find(
            x => x.label === value,
          )?.key;
          return [key, newKey];
        }),
      );
    },
    [requestParams.datasetFields],
  );

  const createCsvDataFromDataKeyMap = useCallback(
    (results: TableData, keyMap: { [p: string]: string | undefined }) => {
      // The column names of the csv based on the rows first item
      const columnNamesObject = results.rows.slice(0, 1)[0];
      return results.rows.slice(1).map(row => {
        return Object.fromEntries(
          // Filters the Normal column or `fallback` data from every data set
          Object.entries(row)
            .filter(([key]) => {
              return columnNamesObject[key] !== 'Normal';
            })
            .map(([key, value]) => {
              const newKey = keyMap[key] ? keyMap[key] : key;
              return [newKey, value];
            }),
        );
      });
    },
    [],
  );

  const getData = useCallback(async () => {
    const results = await loadAdminBoundaryDataset(requestParams);
    if (!results) {
      return;
    }
    const keyMap = createDataKeyMap(results);

    const csvData = createCsvDataFromDataKeyMap(results, keyMap);
    // eslint-disable-next-line no-param-reassign
    dataForCsv.current = {
      ...dataForCsv.current,
      [chartLayer.title]: csvData,
    };
    setChartDataset(results);
  }, [
    chartLayer.title,
    createCsvDataFromDataKeyMap,
    createDataKeyMap,
    dataForCsv,
    requestParams,
  ]);

  useEffect(() => {
    getData();
    return () => {
      // eslint-disable-next-line no-param-reassign
      dataForCsv.current = omit(dataForCsv.current, chartLayer.title);
    };
  }, [chartLayer.title, dataForCsv, getData]);

  const chartType = useMemo(() => {
    return chartLayer.chartData!.type;
  }, [chartLayer.chartData]);

  const colors = useMemo(() => {
    return params.datasetFields?.map(row => row.color);
  }, [params.datasetFields]);

  const config: ChartConfig = useMemo(() => {
    return {
      type: chartType,
      stacked: false,
      category: CHART_DATA_PREFIXES.date,
      data: CHART_DATA_PREFIXES.col,
      transpose: true,
      displayLegend: true,
      colors,
    };
  }, [chartType, colors]);

  const title = useMemo(() => {
    return chartLayer.title;
  }, [chartLayer.title]);

  return useMemo(() => {
    if (!chartDataset) {
      return (
        <div className={classes.loading}>
          <CircularProgress size={50} />
        </div>
      );
    }
    return (
      <Chart
        title={t(title)}
        config={config}
        data={chartDataset}
        notMaintainAspectRatio
        legendAtBottom
      />
    );
  }, [chartDataset, classes.loading, config, t, title]);
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
  adminLevel: 0 | 1 | 2;
  date: number;
  dataForCsv: React.MutableRefObject<any>;
}

export default withStyles(styles)(ChartSection);
