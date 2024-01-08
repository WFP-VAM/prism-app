import React, { memo, useCallback, useMemo } from 'react';
import colormap from 'colormap';
import { ChartOptions } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { TFunctionKeys } from 'i18next';
import moment, { LocaleSpecifier } from 'moment';
import { ChartConfig, DatasetField } from 'config/types';
import { TableData } from 'context/tableStateSlice';
import { useSafeTranslation } from 'i18n';
import { IconButton, Tooltip, makeStyles } from '@material-ui/core';
import ImageIcon from '@material-ui/icons/Image';
import GetAppIcon from '@material-ui/icons/GetApp';
import { downloadToFile } from 'components/MapView/utils';
import { castObjectsArrayToCsv } from 'utils/csv-utils';

interface ChartData {
  labels: (string | number)[];
  datasets: {
    data: (number | null)[];
    label: string;
    fill: boolean;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    pointRadius: number;
    pointHitRadius: number;
  }[];
}

function downloadCsv(chartData: ChartData, filename: string) {
  const columnsNames = Object.fromEntries([
    ['date', 'Date'],
    ...chartData.datasets.map(x => [x.label, x.label.split(' ').join('_')]),
  ]);
  const objectsArray = chartData.labels.map((date, index) => {
    const entries = chartData.datasets.map(set => [set.label, set.data[index]]);
    return {
      date,
      ...Object.fromEntries(entries),
    };
  });

  downloadToFile(
    {
      content: castObjectsArrayToCsv(objectsArray, columnsNames, ','),
      isUrl: false,
    },
    filename,
    'text/csv',
  );
}

function downloadPng(ref: React.RefObject<Bar | Line>, filename: string) {
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

type ChartProps = {
  title: string;
  data: TableData;
  config: ChartConfig;
  datasetFields?: DatasetField[];
  xAxisLabel?: string;
  notMaintainAspectRatio?: boolean;
  legendAtBottom?: boolean;
  chartRange?: [number, number];
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
  }: ChartProps) => {
    const { t } = useSafeTranslation();
    const classes = useStyles();
    const chartRef = React.useRef<Bar | Line>(null);

    const transpose = useMemo(() => {
      return config.transpose || false;
    }, [config.transpose]);

    const header = useMemo(() => {
      return data.rows[0];
    }, [data.rows]);

    const tableRows = useMemo(() => {
      return data.rows.slice(1, data.rows.length);
    }, [data.rows]);

    // Get the keys for the data of interest
    const indices = useMemo(() => {
      return Object.keys(header).filter(key => key.includes(config.data || ''));
    }, [config.data, header]);

    // rainbow-soft map requires nshades to be at least size 11
    const nshades = useMemo(() => {
      if (!transpose) {
        return Math.max(11, tableRows.length);
      }
      return Math.max(11, indices.length);
    }, [indices.length, tableRows.length, transpose]);

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
    }, [colorShuffle, config.colors, nshades]);

    const labels = useMemo(() => {
      if (!transpose) {
        return indices.map(index => header[index]);
      }
      return tableRows.slice(chartRange[0], chartRange[1]).map(row => {
        const dateFormat = data.EWSConfig ? 'HH:mm' : 'YYYY-MM-DD';
        return moment(row[config.category])
          .locale(t('date_locale') as LocaleSpecifier)
          .format(dateFormat);
      });
    }, [
      chartRange,
      config.category,
      data.EWSConfig,
      header,
      indices,
      t,
      tableRows,
      transpose,
    ]);

    // The table rows data sets
    const tableRowsDataSet = useMemo(() => {
      return tableRows.map((row, i) => {
        return {
          label: t(row[config.category] as TFunctionKeys) || '',
          fill: config.fill || false,
          backgroundColor: colors[i],
          borderColor: colors[i],
          borderWidth: 2,
          pointRadius: data.EWSConfig ? 0 : 1, // Disable point rendering for EWS only.
          data: indices.map(index => (row[index] as number) || null),
          pointHitRadius: 10,
        };
      });
    }, [
      colors,
      config.category,
      config.fill,
      data.EWSConfig,
      indices,
      t,
      tableRows,
    ]);

    const configureIndicePointRadius = useCallback(
      (indiceKey: string) => {
        const foundDataSetFieldPointRadius = datasetFields?.find(
          datasetField => {
            return header[indiceKey] === datasetField.label;
          },
        )?.pointRadius;

        if (foundDataSetFieldPointRadius !== undefined) {
          return foundDataSetFieldPointRadius;
        }
        return data.EWSConfig ? 0 : 1; // Disable point rendering for EWS only.
      },
      [data.EWSConfig, datasetFields, header],
    );

    // The indicesDataSet
    const indicesDataSet = useMemo(() => {
      return indices.map((indiceKey, i) => {
        return {
          label: t(header[indiceKey] as TFunctionKeys),
          fill: config.fill || false,
          backgroundColor: colors[i],
          borderColor: colors[i],
          borderWidth: 2,
          data: tableRows.map(row => (row[indiceKey] as number) || null),
          pointRadius: configureIndicePointRadius(indiceKey),
          pointHitRadius: 10,
        };
      });
    }, [
      colors,
      config.fill,
      configureIndicePointRadius,
      header,
      indices,
      t,
      tableRows,
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
          // Deep copy is needed: https://github.com/reactchartjs/react-chartjs-2/issues/524#issuecomment-722814079
          data: [...obj.values],
          fill: false,
        }));
      }
      return [];
    }, [data.EWSConfig]);

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
    const datasets = !transpose ? tableRowsDataSet : indicesDataSet;
    const datasetsWithThresholds = [...datasets, ...EWSthresholds];

    const datasetsTrimmed = datasetsWithThresholds.map(set => ({
      ...set,
      data: set.data.slice(chartRange[0], chartRange[1]),
    }));
    const chartData = {
      labels,
      datasets: datasetsTrimmed,
    };

    const chartConfig = useMemo(() => {
      return {
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
        // display values for all datasets in the tooltip
        tooltips: {
          mode: 'index',
        },
        legend: {
          display: config.displayLegend,
          position: legendAtBottom ? 'bottom' : 'right',
          labels: { boxWidth: 12, boxHeight: 12 },
        },
      } as ChartOptions;
    }, [config, legendAtBottom, notMaintainAspectRatio, title, xAxisLabel]);

    return useMemo(
      () => (
        <>
          <Tooltip title="Download png">
            <IconButton
              onClick={() => downloadPng(chartRef, title.split(' ').join('_'))}
              className={classes.firstIcon}
            >
              <ImageIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download csv">
            <IconButton
              onClick={() => downloadCsv(chartData, title.split(' ').join('_'))}
              className={classes.secondIcon}
            >
              <GetAppIcon />
            </IconButton>
          </Tooltip>
          {(() => {
            switch (config.type) {
              case 'bar':
                return (
                  <Bar ref={chartRef} data={chartData} options={chartConfig} />
                );
              case 'line':
                return (
                  <Line ref={chartRef} data={chartData} options={chartConfig} />
                );
              default:
                console.error(
                  `Charts of type ${config.type} have not been implemented yet.`,
                );
                return null;
            }
          })()}
        </>
      ),
      [
        chartConfig,
        chartData,
        classes.firstIcon,
        classes.secondIcon,
        config.type,
        title,
      ],
    );
  },
);

export default Chart;
