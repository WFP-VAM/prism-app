import { useMemo, useState, useRef } from 'react';
import {
  Typography,
  makeStyles,
  createStyles,
  IconButton,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@material-ui/core';
import { Close, Fullscreen, TableChart, GetApp } from '@material-ui/icons';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import { useSafeTranslation } from 'i18n';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { useSelector } from 'react-redux';
import { AAFloodDataSelector } from 'context/anticipatoryAction/AAFloodStateSlice';
import sortBy from 'lodash/sortBy';
import { getFormattedDate } from 'utils/date-utils';
import {
  CHART_WIDTH,
  ForecastWindowPerCountry,
  TABLE_WIDTH,
} from '../constants';

const forecastWindow = ForecastWindowPerCountry.mozambique;

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      position: 'fixed',
      top: '6vh',
      left: TABLE_WIDTH + 16,
      width: CHART_WIDTH,
      marginLeft: '2rem',
      maxHeight: '70vh',
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    },
    paper: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1rem 0 1rem',
    },
    title: {
      fontWeight: 'bold',
      fontSize: '1.2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      paddingBottom: '0.5rem',
    },
    closeButton: {
      marginTop: '-1rem',
    },
    tabs: {
      minHeight: '34px',
      borderBottom: '1px solid #D4D4D4',
      display: 'flex',
      gap: '4px',
      margin: '0 1rem',
    },
    tab: {
      border: '1px solid #D4D4D4',
      borderBottom: 'none',
      borderRadius: '4px 4px 0 0',
      fontSize: '12px',
      color: '#000',
      textTransform: 'none',
      background: '#F1F1F1',
      minWidth: '150px',
    },
    selectedTab: {
      background: '#FFF',
      fontWeight: 'bold',
    },
    tabPanel: {
      flex: 1,
      margin: '0 1rem',
      border: '1px solid #D4D4D4',
      borderTop: 'none',
      padding: '0.5rem',
      overflow: 'auto',
    },
    chartContainer: {
      height: '400px',
      position: 'relative',
    },
    chartTitle: {
      marginBottom: '1rem',
      fontWeight: 'bold',
      fontSize: '1rem',
    },
    noDataMessage: {
      textAlign: 'center',
      color: '#666',
      fontStyle: 'italic',
      padding: '2rem',
    },
    actionButtons: {
      display: 'flex',
      justifyContent: 'flex-start',
    },
    actionButton: {
      textTransform: 'none',
      fontSize: '0.9rem',
      color: '#333',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
    },
    tableContainer: {
      height: '400px',
      overflow: 'auto',
      color: '#000',
    },
    tableCell: {
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      padding: '8px',
      color: '#000000',
    },
    tableHeader: {
      fontWeight: 'bold',
      backgroundColor: '#f5f5f5',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 10,
      flexDirection: 'column',
      gap: '1rem',
    },
  }),
);

// (removed unused chartFillColor helper)

interface StationChartsProps {
  station: FloodStation;
  onClose?: () => void;
}

function StationCharts({ station, onClose }: StationChartsProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isDownloading, setIsDownloading] = useState(false);
  const hydrographChartRef = useRef<Line>(null);
  const probabilityChartRef = useRef<Line>(null);

  const floodState = useSelector(AAFloodDataSelector);
  const avgProbStation = floodState.avgProbabilitiesData
    ? floodState.avgProbabilitiesData[station.station_name]
    : undefined;

  // Prepare hydrograph data using fetched forecast (discharge) data
  const hydrographData = useMemo(() => {
    const forecast = floodState.forecastData[station.station_name] || [];
    if (!forecast.length) {
      return null;
    }

    // Use valid_time dates for x-axis labels (same as probability format)
    const labels = forecast.map(p => getFormattedDate(p.time, 'short'));
    const { bankfull, moderate, severe } = station.thresholds;

    const membersCount = forecast[0]?.ensemble_members?.length || 0;
    const ensembleDatasets = Array.from(
      { length: membersCount },
      (_v, mIdx) => ({
        label: `Member ${mIdx + 1}`,
        data: forecast.map(fp => fp.ensemble_members[mIdx] ?? 0),
        borderColor: 'rgba(0, 0, 0, 0.18)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line' as any,
        hoverRadius: 0,
        fill: false,
        tension: 0.35,
      }),
    );

    const meanSeries = forecast.map(p => {
      const arr = p.ensemble_members || [];
      if (!arr.length) {
        return 0;
      }
      return arr.reduce((s, v) => s + v, 0) / arr.length;
    });

    return {
      labels,
      datasets: [
        {
          label: t('Ensemble Mean'),
          data: meanSeries,
          borderColor: '#212121',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointStyle: 'line' as any,
          fill: false,
          tension: 0.4,
        },
        {
          label: `${t('Bankfull')} (${bankfull})`,
          data: Array.from({ length: labels.length }, () => bankfull),
          borderColor: '#66BB6A',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as any,
        },
        {
          label: `${t('Moderate')} (${moderate})`,
          data: Array.from({ length: labels.length }, () => moderate),
          borderColor: '#FFA726',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as any,
        },
        {
          label: `${t('Severe')} (${severe})`,
          data: Array.from({ length: labels.length }, () => severe),
          borderColor: '#EF5350',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as any,
        },
        ...ensembleDatasets,
      ],
    };
  }, [floodState.forecastData, station.station_name, station.thresholds, t]);

  const beginIdx = forecastWindow.start - 1;
  const endIdx = forecastWindow.end - 1;

  // Prepare trigger probability data from fetched probabilities
  const probs = floodState.probabilitiesData[station.station_name];
  const sortedData = sortBy(
    floodState.probabilitiesData[station.station_name],
    p => new Date(p.time).getTime(),
  );
  const labels = sortedData.map(d => getFormattedDate(d.time, 'short'));

  const triggerProbabilityData = useMemo(() => {
    if (!probs || probs.length === 0) {
      return null;
    }

    const bankfullSeries = sortedData.map(d => d.bankfull_percentage);
    const moderateSeries = sortedData.map(d => d.moderate_percentage);
    const severeSeries = sortedData.map(d => d.severe_percentage);

    // Use averaged window means and triggers from avg_probabilities.csv
    const bankfullMean = avgProbStation?.avg_bankfull_percentage ?? 0;
    const moderateMean = avgProbStation?.avg_moderate_percentage ?? 0;
    const severeMean = avgProbStation?.avg_severe_percentage ?? 0;

    // Build flat series over the window only (NaN elsewhere)
    const flatWindowSeries = (value: number | null) =>
      bankfullSeries.map((_v, idx) =>
        beginIdx >= 0 && endIdx >= 0 && idx >= beginIdx && idx <= endIdx
          ? (value ?? NaN)
          : NaN,
      );

    // Only show mean fill for the highest severity exceeded
    const bankfullExceeded =
      typeof avgProbStation?.trigger_bankfull === 'number' &&
      bankfullMean > (avgProbStation?.trigger_bankfull as number);
    const moderateExceeded =
      typeof avgProbStation?.trigger_moderate === 'number' &&
      moderateMean > (avgProbStation?.trigger_moderate as number);
    const severeExceeded =
      typeof avgProbStation?.trigger_severe === 'number' &&
      severeMean > (avgProbStation?.trigger_severe as number);

    const fillDatasets: any[] = (() => {
      if (severeExceeded) {
        return [
          {
            label: t('Severe mean fill'),
            data: flatWindowSeries(severeMean * 100),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(239, 83, 80, 0.25)',
            borderWidth: 0,
            pointRadius: 0,
            fill: 2, // fill to Severe threshold dataset
            tension: 0,
            lineTension: 0,
          },
        ];
      }
      if (moderateExceeded) {
        return [
          {
            label: t('Moderate mean fill'),
            data: flatWindowSeries(moderateMean * 100),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(255, 167, 38, 0.25)',
            borderWidth: 0,
            pointRadius: 0,
            fill: 1, // fill to Moderate threshold dataset
            tension: 0,
            lineTension: 0,
          },
        ];
      }
      if (bankfullExceeded) {
        return [
          {
            label: t('Bankfull mean fill'),
            data: flatWindowSeries(bankfullMean * 100),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(102, 187, 106, 0.25)',
            borderWidth: 0,
            pointRadius: 0,
            fill: 0, // fill to Bankfull threshold dataset
            tension: 0,
            lineTension: 0,
          },
        ];
      }
      return [];
    })();

    const thresholdDatasets = [
      typeof avgProbStation?.trigger_bankfull && {
        label: `${t('Bankfull')} (${avgProbStation?.trigger_bankfull}%)`,
        data: Array.from(
          { length: labels.length },
          () => (avgProbStation?.trigger_bankfull as number) * 100,
        ),
        borderColor: 'rgba(102, 187, 106, 0.7)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      },
      typeof avgProbStation?.trigger_moderate && {
        label: `${t('Moderate')} (${avgProbStation?.trigger_moderate}%)`,
        data: Array.from(
          { length: labels.length },
          () => (avgProbStation?.trigger_moderate as number) * 100,
        ),
        borderColor: 'rgba(255, 167, 38, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      },
      typeof avgProbStation?.trigger_severe && {
        label: `${t('Severe')} (${avgProbStation?.trigger_severe}%)`,
        data: Array.from(
          { length: labels.length },
          () => (avgProbStation?.trigger_severe as number) * 100,
        ),
        borderColor: 'rgba(239, 83, 80, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      },
    ].filter(Boolean) as any[];

    return {
      labels,
      datasets: [
        ...thresholdDatasets,
        // Normal lines (no fill)
        {
          label: t('Bankfull'),
          data: bankfullSeries,
          borderColor: 'rgba(102, 187, 106, 0.4)',
          backgroundColor: 'rgba(102, 187, 106, 0.4)',
          borderWidth: 2,
          showLine: false,
          pointRadius: 3,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Moderate'),
          data: moderateSeries,
          borderColor: 'rgba(255, 167, 38, 0.4)',
          backgroundColor: 'rgba(255, 167, 38, 0.4)',
          borderWidth: 2,
          showLine: false,
          pointRadius: 3,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Severe'),
          data: severeSeries,
          borderColor: 'rgba(239, 83, 80, 0.4)',
          backgroundColor: 'rgba(239, 83, 80, 0.4)',
          borderWidth: 2,
          showLine: false,
          pointRadius: 3,
          fill: true,
          tension: 0,
          lineTension: 0,
        },
        // Mean lines over window only (no fill)
        {
          label: t('Bankfull mean (window)'),
          data: flatWindowSeries(bankfullMean * 100),
          borderColor: 'rgba(102, 187, 106, 1)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Moderate mean (window)'),
          data: flatWindowSeries(moderateMean * 100),
          borderColor: 'rgba(255, 167, 38, 1)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Severe mean (window)'),
          data: flatWindowSeries(severeMean * 100),
          borderColor: 'rgba(239, 83, 80, 1)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        // Conditional mean-to-threshold fill: include only highest severity exceeded
        ...fillDatasets,
      ],
    };
  }, [
    probs,
    sortedData,
    avgProbStation?.avg_bankfull_percentage,
    avgProbStation?.avg_moderate_percentage,
    avgProbStation?.avg_severe_percentage,
    avgProbStation?.trigger_bankfull,
    avgProbStation?.trigger_moderate,
    avgProbStation?.trigger_severe,
    t,
    labels,
    beginIdx,
    endIdx,
  ]);

  const hydrographOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 12,
          padding: 15,
          fontSize: 11,
          // Hide ensemble members from legend using the dataset label
          filter: (legendItem: any, chartData: any) => {
            const datasetLabel = String(
              chartData?.datasets?.[legendItem.datasetIndex]?.label ?? '',
            );
            return !/^Member\s\d+$/i.test(datasetLabel);
          },
        },
      },
      scales: {
        xAxes: [
          {
            display: true,
            scaleLabel: {
              display: false,
            },
            ticks: { maxRotation: 0, autoSkip: true },
          },
        ],
        yAxes: [
          {
            display: true,
            ticks: { beginAtZero: true },
            scaleLabel: {
              display: true,
              labelString: t('River Discharge (m³/s)'),
            },
          },
        ],
      },
    }),
    [t],
  );

  const probabilityOptions = useMemo(() => {
    if (!probs || probs.length === 0) {
      return hydrographOptions;
    }

    // Compute y-axis max rounded up to the next dizaine (multiple of 10)
    const maxPct = Math.max(
      50,
      (avgProbStation?.trigger_bankfull || 0) * 100,
      (avgProbStation?.trigger_moderate || 0) * 100,
      (avgProbStation?.trigger_severe || 0) * 100,
      ...probs.map(
        d =>
          Math.max(
            d.bankfull_percentage,
            d.moderate_percentage,
            d.severe_percentage,
          ) * 100,
      ),
    );
    const maxTick = Math.ceil((maxPct + 10) / 10) * 10;

    const windowBeginLabel = labels[beginIdx];
    const windowEndLabel = labels[endIdx];
    const annotations = [
      ...(windowBeginLabel
        ? [
            {
              type: 'line',
              mode: 'vertical',
              scaleID: 'x-axis-0',
              value: windowBeginLabel,
              borderColor: '#2196F3',
              borderDash: [4, 4],
              borderWidth: 1,
              label: {
                enabled: true,
                position: 'top',
                content: t('{{day}}-day forecast', {
                  day: forecastWindow.start,
                }),
                backgroundColor: 'rgba(0,0,0,0)',
                fontColor: '#2196F3',
                xAdjust: -50,
              },
            },
          ]
        : []),
      ...(windowEndLabel
        ? [
            {
              type: 'line',
              mode: 'vertical',
              scaleID: 'x-axis-0',
              value: windowEndLabel,
              borderColor: '#9C27B0',
              borderDash: [4, 4],
              borderWidth: 1,
              label: {
                enabled: true,
                position: 'top',
                content: t('{{day}}-day forecast', { day: forecastWindow.end }),
                backgroundColor: 'rgba(0,0,0,0)',
                fontColor: '#9C27B0',
                xAdjust: -50,
              },
            },
          ]
        : []),
    ];

    return {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false,
      },
      scales: {
        xAxes: [
          {
            gridLines: { display: false },
            scaleLabel: { display: false },
            ticks: { maxRotation: 0, autoSkip: true },
          },
        ],
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
              max: maxTick,
            },
            scaleLabel: { display: false },
          },
        ],
      },
      annotation: {
        drawTime: 'beforeDatasetsDraw',
        annotations,
      },
    } as any;
  }, [
    probs,
    avgProbStation?.trigger_bankfull,
    avgProbStation?.trigger_moderate,
    avgProbStation?.trigger_severe,
    labels,
    beginIdx,
    endIdx,
    t,
    hydrographOptions,
  ]);

  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
    setViewMode('chart');
  };

  const toggleViewMode = () => {
    setViewMode(prev => (prev === 'chart' ? 'table' : 'chart'));
  };

  const download = async () => {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);
    if (viewMode === 'chart') {
      await downloadChart();
    } else {
      await downloadTable();
    }
    setIsDownloading(false);
  };

  const downloadChart = async () => {
    // chartjs needs to render the chart instance and have ctx ready to be used in Base64 conversion
    const maxAttempts = 50; // Max 5 seconds
    // eslint-disable-next-line fp/no-mutation
    for (let attempts = 0; attempts < maxAttempts; attempts += 1) {
      const chartRef =
        activeTab === 1 ? hydrographChartRef : probabilityChartRef;
      const chartInstance = chartRef.current?.chartInstance;
      if (chartInstance && chartInstance.ctx) {
        const base64Image = chartInstance.toBase64Image();
        const link = document.createElement('a');
        link.setAttribute('href', base64Image);
        const chartName =
          activeTab === 1 ? 'Hydrograph' : 'Trigger Probability';
        link.setAttribute(
          'download',
          `${station.station_name}_${chartName}.png`,
        );
        link.click();
        return;
      }
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const downloadTable = async () => {
    const maxAttempts = 50; // Max 5 seconds
    // eslint-disable-next-line fp/no-mutation
    for (let attempts = 0; attempts < maxAttempts; attempts += 1) {
      const tableData =
        activeTab === 1 ? hydrographTableData : triggerProbabilityTableData;

      if (tableData) {
        const csvContent = [
          tableData.columnNames.join(','),
          ...tableData.tableValues.map(row =>
            row.map(cell => `"${cell}"`).join(','),
          ),
        ].join('\n');

        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const tableName =
          activeTab === 1 ? 'Hydrograph' : 'Trigger_Probability';
        link.setAttribute(
          'download',
          `${station.station_name}_${tableName}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        return;
      }
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const hydrographTableData = useMemo(() => {
    if (!hydrographData || !hydrographData.datasets) {
      return null;
    }

    const tableDatasets = hydrographData.datasets.slice(0, 4);

    const columnNames = [t('Day'), ...tableDatasets.map(d => d.label || '')];

    const tableValues = hydrographData.labels.map(
      (rowLabel: string, rowIndex: number) => [
        rowLabel,
        ...tableDatasets.map(dataset => dataset.data?.[rowIndex] ?? '-'),
      ],
    );

    return {
      columnNames,
      tableValues,
    };
  }, [hydrographData, t]);

  const triggerProbabilityTableData = useMemo(() => {
    if (!triggerProbabilityData || !triggerProbabilityData.datasets) {
      return null;
    }

    const columnNames = [
      t('Date'),
      ...triggerProbabilityData.datasets.map(d => d.label || ''),
    ];

    const tableValues = triggerProbabilityData.labels.map(
      (rowLabel: string, rowIndex: number) => [
        rowLabel,
        ...triggerProbabilityData.datasets.map(dataset => {
          const value = dataset.data?.[rowIndex];
          return value ? `${value}%` : '-';
        }),
      ],
    );

    return {
      columnNames,
      tableValues,
    };
  }, [triggerProbabilityData, t]);

  if (!floodState.probabilitiesData[station.station_name]) {
    return (
      <div className={classes.container}>
        <Paper className={classes.paper}>
          <div className={classes.header}>
            <Typography className={classes.title}>
              {station.station_name}
            </Typography>
            {onClose && (
              <IconButton
                className={classes.closeButton}
                onClick={onClose}
                size="small"
              >
                <Close />
              </IconButton>
            )}
          </div>
          <div className={classes.tabPanel}>
            <Typography className={classes.noDataMessage}>
              {t('No historical data available for {{station}}', {
                station: station.station_name,
              })}
            </Typography>
          </div>
        </Paper>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <Paper className={classes.paper}>
        <div className={classes.header}>
          <Typography className={classes.title}>
            {station.station_name}
          </Typography>
          {onClose && (
            <IconButton
              className={classes.closeButton}
              onClick={onClose}
              size="small"
            >
              <Close />
            </IconButton>
          )}
        </div>

        <div className={classes.tabs}>
          <Button
            disableRipple
            className={`${classes.tab} ${activeTab === 0 ? classes.selectedTab : 0}`}
            onClick={() => handleTabChange(0)}
          >
            {t('Trigger probability')}
          </Button>
          <Button
            disableRipple
            className={`${classes.tab} ${activeTab === 1 ? classes.selectedTab : 0}`}
            onClick={() => handleTabChange(1)}
          >
            {t('Hydrograph')}
          </Button>
        </div>

        <div className={classes.tabPanel}>
          {activeTab === 1 &&
            (viewMode === 'chart' ? (
              <div className={classes.chartContainer}>
                {hydrographData && (
                  <Line
                    ref={hydrographChartRef}
                    data={hydrographData}
                    options={hydrographOptions as any}
                  />
                )}
                {isDownloading && (
                  <div className={classes.loadingOverlay}>
                    <CircularProgress />
                    <Typography variant="body2">
                      {t('Preparing chart for download...')}
                    </Typography>
                  </div>
                )}
              </div>
            ) : (
              <TableContainer className={classes.tableContainer}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {hydrographTableData?.columnNames.map(columnName => (
                        <TableCell
                          key={columnName}
                          className={`${classes.tableCell} ${classes.tableHeader}`}
                        >
                          {columnName}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hydrographTableData?.tableValues.map(row => (
                      <TableRow>
                        {row.map(cellValue => (
                          <TableCell
                            key={`${cellValue}`}
                            className={classes.tableCell}
                          >
                            {cellValue}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}

          {activeTab === 0 &&
            (viewMode === 'chart' ? (
              <div className={classes.chartContainer}>
                {triggerProbabilityData && (
                  <Line
                    ref={probabilityChartRef}
                    data={triggerProbabilityData}
                    options={probabilityOptions as any}
                  />
                )}
                {isDownloading && (
                  <div className={classes.loadingOverlay}>
                    <CircularProgress />
                    <Typography variant="body2">
                      {t('Preparing chart for download...')}
                    </Typography>
                  </div>
                )}
              </div>
            ) : (
              <TableContainer className={classes.tableContainer}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {triggerProbabilityTableData?.columnNames.map(
                        columnName => (
                          <TableCell
                            key={columnName}
                            className={`${classes.tableCell} ${classes.tableHeader}`}
                          >
                            {columnName}
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {triggerProbabilityTableData?.tableValues.map(row => (
                      <TableRow>
                        {row.map(cellValue => (
                          <TableCell
                            key={cellValue}
                            className={classes.tableCell}
                          >
                            {cellValue}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
        </div>

        <div className={classes.actionButtons}>
          <Button
            className={classes.actionButton}
            type="button"
            startIcon={<Fullscreen />}
          >
            {t('Expand')}
          </Button>
          <Button
            className={classes.actionButton}
            type="button"
            startIcon={<TableChart />}
            onClick={toggleViewMode}
          >
            {viewMode === 'chart' ? t('View table') : t('View chart')}
          </Button>
          <Button
            className={classes.actionButton}
            type="button"
            startIcon={
              isDownloading ? <CircularProgress size={16} /> : <GetApp />
            }
            onClick={download}
            disabled={isDownloading}
          >
            {isDownloading ? t('Downloading...') : t('Download')}
          </Button>
        </div>
      </Paper>
    </div>
  );
}

export default StationCharts;
