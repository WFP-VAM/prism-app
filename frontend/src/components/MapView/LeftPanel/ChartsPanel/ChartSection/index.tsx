import {
  CircularProgress,
  createStyles,
  Typography,
  WithStyles,
  withStyles,
  Box,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';
import { omit } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { appConfig } from 'config';
import {
  AdminLevelType,
  ChartConfig,
  DatasetField,
  WMSLayerProps,
} from 'config/types';
import {
  CHART_DATA_PREFIXES,
  DatasetRequestParams,
  loadAdminBoundaryDataset,
} from 'context/datasetStateSlice';
import { TableData } from 'context/tableStateSlice';
import { useSafeTranslation } from 'i18n';
import { getChartAdminBoundaryParams } from 'utils/admin-utils';
import Chart, { ChartProps } from 'components/Common/Chart';
import { createCsvDataFromDataKeyMap, createDataKeyMap } from 'utils/csv-utils';

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

// returns startDate and endDate as part of result
function generateDateStrings(startDate: Date, endDate: Date) {
  const result = [];
  const interval = [1, 11, 21];
  const currentDate = new Date(startDate);
  currentDate.setHours(10, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);

  while (currentDate <= endDate) {
    // eslint-disable-next-line fp/no-mutation, no-plusplus
    for (let i = 0; i < 3; i++) {
      currentDate.setDate(interval[i]);
      const formattedDate = currentDate.toISOString().split('T')[0];

      if (currentDate > startDate && currentDate <= endDate) {
        // eslint-disable-next-line fp/no-mutating-methods
        result.push(formattedDate);
      }
    }

    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return result;
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
    // eslint-disable-next-line fp/no-mutation
    lowerDates = result.slice(0, result.length - 1);
  }

  if (maxDate && maxDate > datasetMax) {
    const [, ...result] = generateDateStrings(
      new Date(datasetMax),
      new Date(maxDate),
    );
    // eslint-disable-next-line fp/no-mutation
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
    classes,
  }: ChartSectionProps) => {
    const dispatch = useDispatch();
    const { t } = useSafeTranslation();
    const [chartDataset, setChartDataset] = useState<undefined | TableData>();
    const [extendedChartDataset, setExtendedChartDataset] = useState<
      undefined | TableData
    >();

    React.useEffect(() => {
      if (!chartDataset) {
        return;
      }
      const extended = extendDatasetRows(
        chartDataset,
        chartMaxDateRange?.[0],
        chartMaxDateRange?.[1],
      );

      setExtendedChartDataset(extended);
    }, [chartDataset, chartMaxDateRange]);

    // This effect is used to calculate the max and min values of the chart
    // so that we can put charts on the same scale for comparison.
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

    const [chartDataSetIsLoading, setChartDataSetIsLoading] = useState<boolean>(
      false,
    );
    const [chartDataSetError, setChartDataSetError] = useState<
      string | undefined
    >(undefined);
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
    }, [adminKey, params]);

    const requestParams: DatasetRequestParams = useMemo(() => {
      return {
        id: adminKey,
        level: adminLevel.toString(),
        adminCode: adminCode || appConfig.countryAdmin0Id,
        boundaryProps: params.boundaryProps,
        url: params.url,
        serverLayerName: params.serverLayerName,
        datasetFields: params.datasetFields,
        startDate,
        endDate,
      };
    }, [
      adminCode,
      adminKey,
      adminLevel,
      startDate,
      endDate,
      params.boundaryProps,
      params.datasetFields,
      params.serverLayerName,
      params.url,
    ]);

    const getData = useCallback(async () => {
      setChartDataSetIsLoading(true);
      setChartDataset(undefined);
      try {
        const results = await loadAdminBoundaryDataset(requestParams, dispatch);
        // if an error has occured in the http request or the results are undefined clear the chart
        if (!results) {
          return;
        }
        const keyMap = createDataKeyMap(results, requestParams.datasetFields);

        const csvData = createCsvDataFromDataKeyMap(results, keyMap);
        // eslint-disable-next-line no-param-reassign
        dataForCsv.current = {
          ...dataForCsv.current,
          [chartLayer.title]: csvData,
        };

        setChartDataset(results);
      } catch (error) {
        console.warn(error);
        setChartDataSetError(
          `${t('Error: Impossible to get data for')} ${t(chartLayer.title)} `,
        );
      } finally {
        setChartDataSetIsLoading(false);
      }
    }, [chartLayer.title, dataForCsv, dispatch, requestParams, t]);

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

    const minValue = useMemo(() => {
      return Math.min(
        ...(params.datasetFields
          ?.filter((row: DatasetField) => {
            return row?.minValue !== undefined;
          })
          .map((row: DatasetField) => {
            return row.minValue;
          }) as number[]),
      );
    }, [params.datasetFields]);

    const maxValue = useMemo(() => {
      return Math.max(
        ...(params.datasetFields
          ?.filter((row: DatasetField) => {
            return row?.maxValue !== undefined;
          })
          .map((row: DatasetField) => {
            return row.maxValue;
          }) as number[]),
      );
    }, [params.datasetFields]);

    const config: ChartConfig = useMemo(() => {
      return {
        type: chartType,
        stacked: false,
        category: CHART_DATA_PREFIXES.date,
        data: CHART_DATA_PREFIXES.col,
        transpose: true,
        displayLegend: true,
        minValue: minChartValue || minValue,
        maxValue: maxChartValue || maxValue,
        colors,
      };
    }, [chartType, colors, maxChartValue, maxValue, minChartValue, minValue]);

    const title = useMemo(() => {
      return chartLayer.title;
    }, [chartLayer.title]);

    return useMemo(() => {
      if (chartDataSetIsLoading) {
        return (
          <div className={classes.loading}>
            <CircularProgress size={50} />
          </div>
        );
      }
      if (extendedChartDataset && !chartDataSetIsLoading) {
        return (
          <Chart
            title={t(title)}
            config={config}
            data={extendedChartDataset}
            datasetFields={params.datasetFields}
            chartRange={chartRange}
            notMaintainAspectRatio
            legendAtBottom
            {...chartProps}
          />
        );
      }
      if (chartDataSetError) {
        return (
          <Box className={classes.errorContainer}>
            <Typography color="error" component="p" variant="h4">
              {chartDataSetError}
            </Typography>
          </Box>
        );
      }
      return null;
    }, [
      chartDataSetIsLoading,
      extendedChartDataset,
      chartDataSetError,
      classes.loading,
      classes.errorContainer,
      t,
      title,
      config,
      params.datasetFields,
      chartRange,
      chartProps,
    ]);
  },
);

const styles = () =>
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
  });

export interface ChartSectionProps extends WithStyles<typeof styles> {
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

export default withStyles(styles)(ChartSection);
