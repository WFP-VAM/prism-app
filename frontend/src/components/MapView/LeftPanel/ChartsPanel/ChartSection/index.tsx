import {
  CircularProgress,
  createStyles,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';
import { omit } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
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
  const { code: adminCode, level } = params.boundaryProps[adminKey] || {
    level: '0',
    code: appConfig.countryAdmin0Id,
  };
  useEffect(() => {
    const requestParams: DatasetRequestParams = {
      id: adminKey,
      level,
      adminCode: adminCode || appConfig.countryAdmin0Id,
      boundaryProps: params.boundaryProps,
      url: params.url,
      serverLayerName: params.serverLayerName,
      datasetFields: params.datasetFields,
      selectedDate: date,
    };

    const getData = async () => {
      const results = await loadAdminBoundaryDataset(requestParams);
      if (!results) {
        return;
      }
      const keyMap = Object.fromEntries(
        Object.entries(results.rows[0]).map(([key, value]) => {
          const newKey = requestParams.datasetFields.find(
            x => x.label === value,
          )?.key;
          return [key, newKey];
        }),
      );
      const csvData = results.rows.slice(1).map(row => {
        return Object.fromEntries(
          Object.entries(row).map(([key, value]) => {
            const newKey = keyMap[key] ? keyMap[key] : key;
            return [newKey, value];
          }),
        );
      });
      // eslint-disable-next-line no-param-reassign
      dataForCsv.current = {
        ...dataForCsv.current,
        [chartLayer.title]: csvData,
      };
      setChartDataset(results);
    };

    getData();

    return () => {
      // eslint-disable-next-line no-param-reassign
      dataForCsv.current = omit(dataForCsv.current, chartLayer.title);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adminLevel,
    adminProperties,
    date,
    levels,
    params.boundaryProps,
    params.datasetFields,
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
        <Chart
          title={t(title)}
          config={config}
          data={chartDataset}
          notMaintainAspectRatio
          legendAtBottom
        />
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
  adminLevel: 0 | 1 | 2;
  date: number;
  dataForCsv: React.MutableRefObject<any>;
}

export default withStyles(styles)(ChartSection);
