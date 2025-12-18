import {
  CircularProgress,
  createStyles,
  Typography,
  Box,
  makeStyles,
} from '@material-ui/core';

import { GeoJsonProperties } from 'geojson';
import { omit } from 'lodash';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { AdminLevelType, WMSLayerProps } from 'config/types';
import { CHART_DATA_PREFIXES } from 'context/datasetStateSlice';
import { TableData } from 'context/tableStateSlice';
import { useSafeTranslation } from 'i18n';
import Chart, { ChartProps } from 'components/Common/Chart';
import { createCsvDataFromDataKeyMap, createDataKeyMap } from 'utils/csv-utils';
import { getFormattedDate } from 'utils/date-utils';
import { useChartData } from 'utils/chart-hooks';
import { generateDateStrings } from './utils';

/**
 * This function removes the first occurrence of a specific number from an array.
 * If the number is not found in the array, it returns the original array.
 *
 * @param arr - The array from which the number should be removed.
 * @param numberToRemove - The number to remove from the array.
 * @returns A new array with the first occurrence of the specified number removed.
 */
function removeFirstOccurrence(arr: number[], numberToRemove: number) {
  const indexToRemove = arr.indexOf(numberToRemove);
  if (indexToRemove !== -1) {
    return [...arr.slice(0, indexToRemove), ...arr.slice(indexToRemove + 1)];
  }
  return arr;
}

function extendDatasetRows(
  chartDataset: TableData,
  minDate?: string,
  maxDate?: string,
): TableData {
  const [head, ...data] = chartDataset.rows;
  let lowerDates: string[] = [];
  let upperDates: string[] = [];

  const datasetMin = data[0]?.[CHART_DATA_PREFIXES.date];
  const datasetMax = data[data.length - 1]?.[CHART_DATA_PREFIXES.date];

  if (minDate && minDate < datasetMin) {
    const result = generateDateStrings(new Date(minDate), new Date(datasetMin));

    lowerDates = result.slice(0, result.length - 1);
  }

  if (maxDate && maxDate > datasetMax) {
    const [, ...result] = generateDateStrings(
      new Date(datasetMax),
      new Date(maxDate),
    );

    upperDates = result;
  }

  return {
    ...chartDataset,
    rows: [
      head,
      ...lowerDates.map(x => ({
        [CHART_DATA_PREFIXES.date]: x,
      })),
      ...data,
      ...upperDates.map(x => ({
        [CHART_DATA_PREFIXES.date]: x,
      })),
    ],
  };
}

const ChartSection = memo(
  ({
    chartLayer,
    adminProperties,
    adminLevel,
    startDate,
    endDate,
    dataForCsv,
    chartRange,
    chartMaxDateRange,
    setMaxDataTicks,
    setChartSelectedDateRange,
    setChartMaxDateRange,
    setMaxChartValues,
    setMinChartValues,
    maxChartValue,
    minChartValue,
    chartProps,
  }: ChartSectionProps) => {
    const classes = useStyles();
    const { t } = useSafeTranslation();

    const {
      chartDataset,
      isLoading,
      error,
      chartConfig,
      chartTitle,
      chartSubtitle,
    } = useChartData({
      chartLayer,
      adminProperties,
      adminLevel,
      startDate,
      endDate,
      enabled: true,
    });

    const [extendedChartDataset, setExtendedChartDataset] = useState<
      undefined | TableData
    >();

    const comparingCharts = !chartMaxDateRange;

    React.useEffect(() => {
      if (!chartDataset) {
        return;
      }

      if (comparingCharts) {
        setExtendedChartDataset(
          extendDatasetRows(
            chartDataset,
            getFormattedDate(startDate, 'default'),
            getFormattedDate(endDate, 'default'),
          ),
        );
        return;
      }

      setExtendedChartDataset(
        extendDatasetRows(
          chartDataset,
          chartMaxDateRange?.[0],
          chartMaxDateRange?.[1],
        ),
      );
    }, [chartDataset, chartMaxDateRange, comparingCharts, endDate, startDate]);

    // Calculate max and min values for comparison charts to keep them on the same scale
    React.useEffect(() => {
      if (!(extendedChartDataset && setMaxChartValues && setMinChartValues)) {
        return () => {};
      }
      const keys = Object.keys(extendedChartDataset.rows[0]).filter(
        x => x !== CHART_DATA_PREFIXES.date,
      );
      const max = extendedChartDataset.rows.reduce(
        (m, curr) =>
          Math.max(
            ...keys
              .map(i => curr[i])
              .filter((x): x is number => typeof x === 'number'),
            m,
          ),
        Number.NEGATIVE_INFINITY,
      );
      const min = extendedChartDataset.rows.reduce(
        (m, curr) =>
          Math.min(
            ...keys
              .map(i => curr[i])
              .filter((x): x is number => typeof x === 'number'),
            m,
          ),
        Number.POSITIVE_INFINITY,
      );
      setMaxChartValues(prev => [...prev, max]);
      setMinChartValues(prev => [...prev, min]);
      return () => {
        setMaxChartValues(prev => removeFirstOccurrence(prev, max));
        setMinChartValues(prev => removeFirstOccurrence(prev, min));
      };
    }, [extendedChartDataset, setMaxChartValues, setMinChartValues]);

    React.useEffect(() => {
      if (!extendedChartDataset) {
        return;
      }

      // first is the head, contains no data
      if (extendedChartDataset.rows.length > 1 && setChartMaxDateRange) {
        const min = extendedChartDataset.rows[1][
          CHART_DATA_PREFIXES.date
        ] as string;
        const max = extendedChartDataset.rows[
          extendedChartDataset.rows.length - 1
        ][CHART_DATA_PREFIXES.date] as string;

        const newMin =
          !chartMaxDateRange?.[0] || min < chartMaxDateRange?.[0]
            ? min
            : chartMaxDateRange?.[0];

        const newMax =
          !chartMaxDateRange?.[1] || max > chartMaxDateRange?.[1]
            ? max
            : chartMaxDateRange?.[1];

        // dangerous territory here, we have to check if the values are same as before, se we don't enter a loop
        if (
          chartMaxDateRange?.[0] !== newMin ||
          chartMaxDateRange?.[1] !== newMax
        ) {
          setChartMaxDateRange([newMin, newMax]);
        }
      }

      if (setMaxDataTicks) {
        setMaxDataTicks(prev =>
          prev > extendedChartDataset.rows.length
            ? prev
            : extendedChartDataset.rows.length,
        );
      }
    }, [
      extendedChartDataset,
      chartMaxDateRange,
      setChartMaxDateRange,
      setMaxDataTicks,
    ]);

    // Update chart selected date range based on slider position
    useEffect(() => {
      if (!extendedChartDataset) {
        return;
      }
      const selectedSlice = extendedChartDataset.rows.slice(
        chartRange?.[0],
        chartRange?.[1],
      );
      if (setChartSelectedDateRange) {
        setChartSelectedDateRange([
          selectedSlice[0]?.[CHART_DATA_PREFIXES.date] as string,
          selectedSlice[selectedSlice.length - 1]?.[
            CHART_DATA_PREFIXES.date
          ] as string,
        ]);
      }
    }, [extendedChartDataset, chartRange, setChartSelectedDateRange]);

    // Generate CSV data for download
    useEffect(() => {
      if (!chartDataset || !chartLayer.chartData?.fields) {
        return () => {};
      }

      const keyMap = createDataKeyMap(
        chartDataset,
        chartLayer.chartData.fields,
      );
      const csvData = createCsvDataFromDataKeyMap(chartDataset, keyMap);

      dataForCsv.current = {
        ...dataForCsv.current,
        [chartLayer.title]: csvData,
      };

      return () => {
        dataForCsv.current = omit(dataForCsv.current, chartLayer.title);
      };
    }, [
      chartDataset,
      chartLayer.title,
      chartLayer.chartData?.fields,
      dataForCsv,
    ]);

    const overriddenConfig = useMemo(() => {
      if (!chartConfig) {
        return null;
      }
      return {
        ...chartConfig,
        minValue: minChartValue || chartConfig.minValue,
        maxValue: maxChartValue || chartConfig.maxValue,
      };
    }, [chartConfig, minChartValue, maxChartValue]);

    return useMemo(() => {
      if (isLoading) {
        return (
          <div className={classes.loading}>
            <CircularProgress size={50} />
          </div>
        );
      }
      if (error) {
        return (
          <Box className={classes.errorContainer}>
            <Typography color="error" component="p" variant="h4">
              {`${t('Error: Impossible to get data for')} ${t(chartLayer.title)}`}
            </Typography>
          </Box>
        );
      }
      if (extendedChartDataset && overriddenConfig) {
        return (
          <Chart
            title={t(chartTitle)}
            subtitle={t(chartSubtitle)}
            config={overriddenConfig}
            data={extendedChartDataset}
            datasetFields={chartLayer.chartData?.fields}
            chartRange={chartRange}
            notMaintainAspectRatio
            legendAtBottom
            {...chartProps}
          />
        );
      }
      return null;
    }, [
      isLoading,
      error,
      extendedChartDataset,
      overriddenConfig,
      classes.loading,
      classes.errorContainer,
      t,
      chartTitle,
      chartSubtitle,
      chartLayer.chartData?.fields,
      chartLayer.title,
      chartRange,
      chartProps,
    ]);
  },
);

const useStyles = makeStyles(() =>
  createStyles({
    errorContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
    },
    loading: {
      height: 240,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }),
);

export interface ChartSectionProps {
  chartLayer: WMSLayerProps;
  adminProperties: GeoJsonProperties;
  adminLevel: AdminLevelType;
  startDate: number;
  endDate: number;
  dataForCsv: React.MutableRefObject<any>;
  chartRange?: [number, number];
  chartMaxDateRange?: [string, string];
  setMaxDataTicks?: React.Dispatch<React.SetStateAction<number>>;
  setChartSelectedDateRange?: React.Dispatch<
    React.SetStateAction<[string, string]>
  >;
  setChartMaxDateRange?: React.Dispatch<React.SetStateAction<[string, string]>>;
  setMaxChartValues?: React.Dispatch<React.SetStateAction<number[]>>;
  setMinChartValues?: React.Dispatch<React.SetStateAction<number[]>>;
  maxChartValue?: number;
  minChartValue?: number;
  chartProps?: Partial<ChartProps>;
}

export default ChartSection;
