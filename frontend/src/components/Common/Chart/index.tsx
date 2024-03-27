import React, { memo, useCallback, useMemo } from 'react';
import colormap from 'colormap';
import { ChartOptions } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { TFunctionKeys } from 'i18next';
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
    top: 0,
    right: 0,
    padding: '0.25rem',
  },
  secondIcon: {
    position: 'absolute',
    top: 0,
    right: '2rem',
    padding: '0.25rem',
  },
}));

export type ChartProps = {
  title: string;
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
};

const Chart = memo(
  ({
    title,
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
  }: ChartProps) => {
    const { t } = useSafeTranslation();
    const classes = useStyles();
    const chartRef = React.useRef<Bar | Line>(null);
    const isEWSChart = !!data.EWSConfig;

    const downloadFilename = buildCsvFileName([
      ...downloadFilenamePrefix,
      ...title.split(' '),
    ]);

    const transpose = useMemo(() => {
      return config.transpose || false;
    }, [config.transpose]);

    const header = useMemo(() => {
      return data.rows[0];
    }, [data.rows]);

    const tableRows = useMemo(() => {
      return data.rows.slice(1);
    }, [data.rows]);

    const indices = useMemo(() => {
      return Object.keys(header).filter(key => key.includes(config.data || ''));
    }, [config.data, header]);

    const nshades = useMemo(() => {
      return Math.max(11, transpose ? indices.length : tableRows.length);
    }, [transpose, indices.length, tableRows.length]);

    const colorShuffle = useCallback((colors: string[]) => {
      return colors.map((_, i) =>
        i % 2 ? colors[i] : colors[colors.length - i - 1],
      );
    }, []);

    const colors = useMemo(() => {
      return (
        config.colors ||
        colorShuffle(
          colormap({
            colormap: 'rainbow-soft',
            nshades,
            format: 'hex',
            alpha: 0.5,
          }),
        )
      );
    }, [config.colors, colorShuffle, nshades]);

    const labels = useMemo(() => {
      return transpose
        ? tableRows
            .slice(chartRange[0], chartRange[1])
            .map(row => row[config.category])
        : indices.map(index => header[index]);
    }, [transpose, chartRange, tableRows, config.category, header, indices]);

    const tableRowsDataSet = useMemo(() => {
      return tableRows.map((row, i) => ({
        label: t(row[config.category] as TFunctionKeys) || '',
        fill: config.fill || false,
        backgroundColor: colors[i],
        borderColor: colors[i],
        borderWidth: 2,
        pointRadius: isEWSChart ? 0 : 1,
        data: indices.map(index => (row[index] as number) || null),
        pointHitRadius: 10,
      }));
    }, [
      tableRows,
      t,
      config.category,
      config.fill,
      colors,
      indices,
      isEWSChart,
    ]);

    const configureIndicePointRadius = useCallback(
      (indiceKey: string) => {
        const foundDataSetFieldPointRadius = datasetFields?.find(
          datasetField => header[indiceKey] === datasetField.label,
        )?.pointRadius;

        if (foundDataSetFieldPointRadius !== undefined) {
          return foundDataSetFieldPointRadius;
        }
        // Disable point rendering for EWS charts.
        if (isEWSChart) {
          return 0;
        }
        return 1;
      },
      [datasetFields, header, isEWSChart],
    );

    const indicesDataSet = useMemo(() => {
      return indices.map((indiceKey, i) => ({
        label: t(header[indiceKey] as TFunctionKeys),
        fill: config.fill || false,
        backgroundColor: colors[i],
        borderColor: colors[i],
        borderWidth: 2,
        data: tableRows.map(row => (row[indiceKey] as number) || null),
        pointRadius: configureIndicePointRadius(indiceKey),
        pointHitRadius: 10,
      }));
    }, [
      t,
      header,
      indices,
      config.fill,
      colors,
      tableRows,
      configureIndicePointRadius,
    ]);

    const EWSthresholds = useMemo(() => {
      if (data.EWSConfig) {
        return Object.values(data.EWSConfig).map(obj => ({
          label: obj.label,
          backgroundColor: obj.color,
          borderColor: obj.color,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: [...obj.values],
          fill: false,
        }));
      }
      return [];
    }, [data.EWSConfig]);

    /*
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
    const datasets = useMemo(() => {
      const allDataSets = transpose ? indicesDataSet : tableRowsDataSet;
      return [...allDataSets, ...EWSthresholds].map(set => ({
        ...set,
        data: set.data.slice(chartRange[0], chartRange[1]),
      }));
    }, [
      transpose,
      indicesDataSet,
      tableRowsDataSet,
      EWSthresholds,
      chartRange,
    ]);

    const chartData = useMemo(() => ({ labels, datasets }), [labels, datasets]);

    const chartConfig = useMemo(
      () =>
        ({
          maintainAspectRatio: !(notMaintainAspectRatio ?? false),
          title: {
            fontColor: '#CCC',
            display: true,
            text: title,
            fontSize: 14,
          },
          scales: {
            xAxes: [
              {
                stacked: config?.stacked ?? false,
                gridLines: {
                  display: false,
                },
                ticks: {
                  callback: value => {
                    return isEWSChart ? String(value).split(' ')[1] : value;
                  },
                  fontColor: '#CCC',
                },
                ...(xAxisLabel
                  ? {
                      scaleLabel: {
                        labelString: xAxisLabel,
                        display: true,
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
                },
                stacked: config?.stacked ?? false,
                gridLines: {
                  display: false,
                },
              },
            ],
          },
          tooltips: {
            mode: 'index',
          },
          legend: {
            display: config.displayLegend,
            position: legendAtBottom ? 'bottom' : 'right',
            labels: { boxWidth: 12, boxHeight: 12 },
          },
        } as ChartOptions),
      [
        config,
        isEWSChart,
        legendAtBottom,
        notMaintainAspectRatio,
        title,
        xAxisLabel,
      ],
    );

    const handleDownloadChartPng = useCallback(() => {
      downloadChartPng(chartRef, downloadFilename);
    }, [chartRef, downloadFilename]);

    const handleDownloadCsv = useCallback(() => {
      const keyMap = datasetFields ? createDataKeyMap(data, datasetFields) : {};
      downloadChartsToCsv([
        [
          { [title]: createCsvDataFromDataKeyMap(data, keyMap) },
          downloadFilename,
        ],
      ])();
    }, [data, datasetFields, downloadFilename, title]);

    if (!['bar', 'line'].includes(config.type)) {
      console.error(
        `Charts of type ${config.type} have not been implemented yet.`,
      );
      return null;
    }

    return (
      <>
        {showDownloadIcons && (
          <>
            <Tooltip title={t('Download PNG') as string}>
              <IconButton
                onClick={handleDownloadChartPng}
                className={classes.firstIcon}
                style={iconStyles}
              >
                <ImageIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('Download CSV') as string}>
              <IconButton
                onClick={handleDownloadCsv}
                className={classes.secondIcon}
                style={iconStyles}
              >
                <GetAppIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
        {config.type === 'bar' ? (
          <Bar ref={chartRef} data={chartData} options={chartConfig} />
        ) : (
          <Line ref={chartRef} data={chartData} options={chartConfig} />
        )}
      </>
    );
  },
);

export default Chart;
