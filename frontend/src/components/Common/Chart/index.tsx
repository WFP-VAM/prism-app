import React, { memo, useCallback, useMemo, useState } from 'react';
import colormap from 'colormap';
import { ChartOptions } from 'chart.js';
import 'chartjs-plugin-annotation';
import { Bar, Line } from 'react-chartjs-2';
import { ChartConfig, DatasetField } from 'config/types';
import { TableData } from 'context/tableStateSlice';
import { useSafeTranslation } from 'i18n';
import { IconButton, Tooltip, makeStyles } from '@material-ui/core';
import ImageIcon from '@material-ui/icons/Image';
import GetAppIcon from '@material-ui/icons/GetApp';
import { buildCsvFileName, downloadToFile } from 'components/MapView/utils';
import {
  createCsvDataFromDataKeyMap,
  createDataKeyMap,
  downloadChartsToCsv,
} from 'utils/csv-utils';

function downloadChartPng(ref: React.RefObject<Bar | Line>, filename: string) {
  const chart = ref.current;
  if (!chart) {
    throw new Error('chart is undefined');
  }
  const { canvas } = chart.chartInstance;
  if (!canvas) {
    throw new Error('canvas is undefined');
  }
  const file = canvas.toDataURL('image/png');
  downloadToFile({ content: file, isUrl: true }, filename, 'image/png');
}

const useStyles = makeStyles(() => ({
  firstIcon: {
    position: 'absolute',
    top: '8px',
    right: '0rem',
    padding: '0.25rem',
  },
  secondIcon: {
    position: 'absolute',
    top: '8px',
    right: '1.75rem',
    padding: '0.25rem',
  },
}));

export type ChartProps = {
  title: string;
  subtitle?: string;
  data: TableData;
  config: ChartConfig;
  datasetFields?: DatasetField[];
  xAxisLabel?: string;
  notMaintainAspectRatio?: boolean;
  legendAtBottom?: boolean;
  chartRange?: [number, number];
  showDownloadIcons?: boolean;
  iconStyles?: React.CSSProperties;
  downloadFilenamePrefix?: string[];
  units?: string;
  yAxisLabel?: string;
  responsive?: boolean;
  height?: number;
};

const Chart = memo(
  React.forwardRef<Bar | Line, ChartProps>(
    (
      {
        title,
        subtitle,
        data,
        config,
        xAxisLabel,
        datasetFields,
        notMaintainAspectRatio,
        legendAtBottom,
        chartRange = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
        showDownloadIcons = false,
        iconStyles,
        downloadFilenamePrefix = [],
        units,
        yAxisLabel,
        responsive = true,
        height,
      },
      forwardedRef,
    ) => {
      const { t } = useSafeTranslation();
      const classes = useStyles();
      const localChartRef = React.useRef<Bar | Line>(null);
      const chartRef = (forwardedRef || localChartRef) as React.RefObject<
        Bar | Line
      >;
      // This isChartReady state allows us to trigger a render after the chart is ready to update the saved ref
      const [_isChartReady, setIsChartReady] = useState(false);

      const isEWSChart = !!data.EWSConfig;
      const isGoogleFloodChart = !!data.GoogleFloodConfig;
      const isFloodChart = isEWSChart || isGoogleFloodChart;

      const downloadFilename = buildCsvFileName([
        ...downloadFilenamePrefix,
        ...title.split(' '),
      ]);

      const transpose = useMemo(
        () => config.transpose || false,
        [config.transpose],
      );

      const header = useMemo(() => data.rows[0], [data.rows]);

      const tableRows = useMemo(
        () => data.rows.slice(1, data.rows.length),
        [data.rows],
      );

      // Get the keys for the data of interest
      const indices = useMemo(
        () =>
          Object.keys(header).filter(key => key.includes(config.data || '')),
        [config.data, header],
      );

      // rainbow-soft map requires nshades to be at least size 11
      const nshades = useMemo(() => {
        if (!transpose) {
          return Math.max(11, tableRows.length);
        }
        return Math.max(11, indices.length);
      }, [indices.length, tableRows.length, transpose]);

      const colorShuffle = useCallback(
        (colors: string[]) =>
          colors.map((_, i) =>
            i % 2 ? colors[i] : colors[colors.length - i - 1],
          ),
        [],
      );

      const colors = useMemo(
        () =>
          config.colors ||
          colorShuffle(
            colormap({
              colormap: 'rainbow-soft',
              nshades,
              format: 'hex',
              alpha: 0.5,
            }),
          ),
        [colorShuffle, config.colors, nshades],
      );

      const labels = React.useMemo(() => {
        if (!transpose) {
          return indices.map(index => header[index]);
        }
        return tableRows
          .slice(chartRange[0], chartRange[1])
          .map(row => row[config.category]);
      }, [chartRange, config.category, header, indices, tableRows, transpose]);

      // The table rows data sets
      const tableRowsDataSet = useMemo(
        () =>
          tableRows.map((row, i) => ({
            label: t(row[config.category] as any) || '',
            fill: config.fill || false,
            backgroundColor: colors[i],
            borderColor: colors[i],
            borderWidth: 2,
            pointRadius: isFloodChart ? 0 : 1, // Disable point rendering for flood charts only.
            data: indices.map(index => (row[index] as number) || null),
            pointHitRadius: 10,
          })),
        [
          colors,
          config.category,
          config.fill,
          indices,
          isFloodChart,
          t,
          tableRows,
        ],
      );

      const configureIndicePointRadius = useCallback(
        (indiceKey: string) => {
          const foundDataSetFieldPointRadius = datasetFields?.find(
            datasetField => header[indiceKey] === datasetField.label,
          )?.pointRadius;

          if (foundDataSetFieldPointRadius !== undefined) {
            return foundDataSetFieldPointRadius;
          }
          return isFloodChart ? 0 : 1; // Disable point rendering for flood charts only.
        },
        [isFloodChart, datasetFields, header],
      );

      // The indicesDataSet
      const indicesDataSet = useMemo(
        () =>
          indices.map((indiceKey, i) => ({
            label: t(header[indiceKey] as any),
            fill: config.fill || false,
            backgroundColor: colors[i],
            borderColor: colors[i],
            borderWidth: 3,
            data: tableRows.map(row => (row[indiceKey] as number) || null),
            pointRadius: configureIndicePointRadius(indiceKey),
            pointHitRadius: 10,
          })),
        [
          colors,
          config.fill,
          configureIndicePointRadius,
          header,
          indices,
          t,
          tableRows,
        ],
      );

      const floodThresholds = useMemo(() => {
        if (data.EWSConfig) {
          return Object.values(data.EWSConfig).map(obj => ({
            label: obj.label,
            backgroundColor: obj.color,
            borderColor: obj.color,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            // Deep copy is needed: https://github.com/reactchartjs/react-chartjs-2/issues/524#issuecomment-722814079
            data: [...obj.values],
            fill: false,
          }));
        }
        if (data.GoogleFloodConfig) {
          return Object.values(data.GoogleFloodConfig).map(obj => ({
            label: obj.label,
            backgroundColor: obj.color,
            borderColor: obj.color,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            // Deep copy is needed: https://github.com/reactchartjs/react-chartjs-2/issues/524#issuecomment-722814079
            data: [...obj.values],
            fill: false,
          }));
        }
        return [];
      }, [data.EWSConfig, data.GoogleFloodConfig]);

      /**
       * The following value assumes that the data is formatted as follows:
       * First Row -> "keys"
       * Second Row -> "column names / headers"
       *
       * Example:
       *  Month,data1,data2,data3
       *  Month,Average,High,Low
       *  Dec-18,6750,12000,3200
       *  Jan-19,6955,10600,3600
       *  Feb-19,6881,10300,3600
       *  Mar-19,6505,10000,2700
       *  Apr-19,6319,10200,3000
       *
       * The function uses the config fields:
       *  - data: the identifier fot keys. Eg. config.data = data for the above dataset
       *          will select columns data1, data2, data3
       *
       * - category: the key to use to identify categories. Eg. "Month" in the example above.
       *
       * - transpose: specify if rows or columns should be used to form datasets.
       *               By default, the function uses each row as a dataset.
       *               In the example above, we will need to transpose the data
       *               using config.transpose = true.
       *  - fill
       */

      const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
      }, []);

      const parseDateString = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
      };

      const isFutureDate = useCallback(
        (dateString: string) => parseDateString(dateString) >= today,
        [today],
      );
      const isPastDate = useCallback(
        (dateString: string) => parseDateString(dateString) <= today,
        [today],
      );

      const datasets = !transpose ? tableRowsDataSet : indicesDataSet;
      const datasetsWithThresholds = [...datasets, ...floodThresholds];

      const datasetsTrimmed = datasetsWithThresholds.map(set => ({
        ...set,
        data: set.data.slice(chartRange[0], chartRange[1]),
      }));

      const chartData = React.useMemo(() => {
        if (isGoogleFloodChart) {
          const pastDatasets = datasets.map(dataset => ({
            ...dataset,
            data: dataset.data.map((point, index) =>
              isPastDate(labels[index] as string) ? point : null,
            ),
            borderDash: 0,
          }));
          const futureDatasets = datasets.map(dataset => ({
            ...dataset,
            label: t(`${dataset.label} (Future)`),
            data: dataset.data.map((point, index) =>
              isFutureDate(labels[index] as string) ? point : null,
            ),
            borderDash: [5, 5],
          }));
          return {
            labels,
            datasets: [...pastDatasets, ...futureDatasets, ...floodThresholds],
          };
        }
        return {
          labels,
          datasets: datasetsTrimmed,
        };
      }, [
        isGoogleFloodChart,
        labels,
        floodThresholds,
        datasets,
        datasetsTrimmed,
        isPastDate,
        t,
        isFutureDate,
      ]);

      const chartConfig = useMemo(
        () =>
          ({
            maintainAspectRatio: !(notMaintainAspectRatio ?? false),
            title: {
              fontColor: '#CCC',
              display: true,
              text: subtitle ? [title, subtitle] : title,
              fontSize: 14,
            },
            responsive,
            scales: {
              xAxes: [
                {
                  stacked: config?.stacked ?? false,
                  gridLines: {
                    display: false,
                  },
                  ticks: {
                    callback: value =>
                      // for EWS charts, we only want to display the time
                      isEWSChart ? String(value).split(' ')[1] : value,
                    fontColor: '#CCC',
                  },
                  ...(xAxisLabel
                    ? {
                        scaleLabel: {
                          labelString: xAxisLabel,
                          display: true,
                          lineHeight: 1.5,
                          fontColor: '#AAA',
                        },
                      }
                    : {}),
                },
              ],
              yAxes: [
                {
                  ticks: {
                    fontColor: '#CCC',
                    ...(config?.minValue && { suggestedMin: config?.minValue }),
                    ...(config?.maxValue && { suggestedMax: config?.maxValue }),
                    maxTicksLimit: 8,
                    callback: (value: string) =>
                      `${value}${units ? ` ${units}` : ''}`,
                  },
                  stacked: config?.stacked ?? false,
                  gridLines: {
                    display: false,
                  },
                  afterDataLimits: axis => {
                    // Increase y-axis by 20% for Google Flood charts to make space for the annotation label
                    if (isGoogleFloodChart) {
                      const range = axis.max - axis.min;
                      axis.max += range * 0.25; // eslint-disable-line no-param-reassign, fp/no-mutation
                    }
                  },
                  ...(yAxisLabel
                    ? {
                        scaleLabel: {
                          display: true,
                          labelString: yAxisLabel,
                          lineHeight: 1.5,
                          fontColor: '#AAA',
                        },
                      }
                    : {}),
                },
              ],
            },
            tooltips: {
              mode: 'index',
              callbacks: {
                label: (tooltipItem, labelData) => {
                  const datasetLabel =
                    labelData.datasets?.[tooltipItem.datasetIndex as number]
                      ?.label || '';
                  const value = tooltipItem.yLabel;
                  const unitLabel = units ? ` ${units}` : '';

                  // Get the data point for the current tooltip item
                  const dataPoint =
                    labelData.datasets?.[tooltipItem.datasetIndex as number]
                      ?.data?.[tooltipItem.index as number];

                  // Check if any label is present in the tooltip
                  const labelPresent = labelData.datasets?.some(dataset => {
                    const { label } = dataset;
                    if (tooltipItem.index !== undefined) {
                      const indexData = dataset.data?.[tooltipItem.index];
                      return (
                        label === datasetLabel.replace(' (Future)', '') &&
                        indexData !== null
                      );
                    }
                    return false;
                  });

                  // Hide "{label} (Future)" if "{label}" is present
                  if (labelPresent && datasetLabel.includes(' (Future)')) {
                    return null;
                  }

                  // Only show labels with non-null data points
                  if (dataPoint !== null) {
                    return `${datasetLabel}: ${value}${unitLabel}`;
                  }

                  return null;
                },
              },
            },
            legend: {
              display: config.displayLegend,
              position: legendAtBottom ? 'bottom' : 'right',
              labels: { boxWidth: 12, boxHeight: 12 },
            },
            animation: {
              onComplete: () => {
                setIsChartReady(true);
              },
            },
            ...(isGoogleFloodChart
              ? {
                  annotation: {
                    annotations: [
                      {
                        type: 'line',
                        mode: 'vertical',
                        scaleID: 'x-axis-0',
                        value: today.toISOString().split('T')[0],
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                        borderWidth: 2,
                        label: {
                          content: t('Today'),
                          enabled: true,
                          position: 'top',
                          yAdjust: -6,
                          fontColor: '#CCC',
                          fontSize: 10,
                        },
                      },
                    ],
                  },
                }
              : {}),
          }) as ChartOptions,
        [
          notMaintainAspectRatio,
          responsive,
          subtitle,
          title,
          config?.stacked,
          config?.minValue,
          config?.maxValue,
          config.displayLegend,
          xAxisLabel,
          legendAtBottom,
          isGoogleFloodChart,
          today,
          t,
          isEWSChart,
          units,
          yAxisLabel,
        ],
      );

      return useMemo(
        () => (
          <div
            style={{
              position: 'relative',
              height: height ? `${height}px` : '100%',
              width: '100%',
            }}
          >
            {showDownloadIcons && (
              <>
                <Tooltip title={t('Download PNG') as string}>
                  <IconButton
                    onClick={() => downloadChartPng(chartRef, downloadFilename)}
                    className={classes.firstIcon}
                    style={iconStyles}
                  >
                    <ImageIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('Download CSV') as string}>
                  <IconButton
                    onClick={() => {
                      const keyMap = datasetFields
                        ? createDataKeyMap(data, datasetFields)
                        : {};

                      downloadChartsToCsv([
                        [
                          {
                            [title]: createCsvDataFromDataKeyMap(data, keyMap),
                          },
                          downloadFilename,
                        ],
                      ])();
                    }}
                    className={classes.secondIcon}
                    style={iconStyles}
                  >
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {(() => {
              switch (config.type) {
                case 'bar':
                  return (
                    <Bar
                      ref={chartRef}
                      data={chartData}
                      options={chartConfig}
                    />
                  );
                case 'line':
                  return (
                    <Line
                      ref={chartRef}
                      data={chartData}
                      options={chartConfig}
                    />
                  );
                default:
                  console.error(
                    `Charts of type ${config.type} have not been implemented yet.`,
                  );
                  return null;
              }
            })()}
          </div>
        ),
        [
          chartConfig,
          chartData,
          chartRef,
          classes.firstIcon,
          classes.secondIcon,
          config.type,
          data,
          datasetFields,
          downloadFilename,
          height,
          iconStyles,
          showDownloadIcons,
          t,
          title,
        ],
      );
    },
  ),
);

export default Chart;
