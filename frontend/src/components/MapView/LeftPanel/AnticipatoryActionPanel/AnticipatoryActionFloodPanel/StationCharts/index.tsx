import React, { useMemo, useState, useRef } from 'react';
import {
  Typography,
  makeStyles,
  createStyles,
  Tabs,
  Tab,
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
      borderBottom: '1px solid #e0e0e0',
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
      minHeight: '48px',
    },
    tabPanel: {
      flex: 1,
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

  // Prepare hydrograph data using fetched forecast (discharge) data
  const hydrographData = useMemo(() => {
    const forecast = floodState.forecastData[station.station_name] || [];
    if (!forecast.length) {
      return null;
    }

    const labels = forecast.map((_p, idx) => `${idx}`);
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

  // Prepare trigger probability data from fetched probabilities
  const triggerProbabilityData = useMemo(() => {
    const probs = floodState.probabilitiesData[station.station_name];
    if (!probs || probs.length === 0) {
      return null;
    }

    const sortedData = sortBy(probs, p => new Date(p.time).getTime());

    const labels = sortedData.map(d =>
      new Date(d.time).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      }),
    );
    const bankfullSeries = sortedData.map(d => d.bankfull_percentage);
    const moderateSeries = sortedData.map(d => d.moderate_percentage);
    const severeSeries = sortedData.map(d => d.severe_percentage);

    const bankfullTrigger = 38;
    const moderateTrigger = 19;
    const severeTrigger = 10;

    // Forecast window indices (inclusive)
    const clampIndex = (i: number) =>
      Math.max(0, Math.min(labels.length - 1, i));
    const startIdx = clampIndex(forecastWindow.start);
    const endIdx = clampIndex(forecastWindow.end);

    // Compute mean in window (inclusive) for each line
    const meanInWindow = (arr: number[]) => {
      const slice = arr.slice(startIdx, endIdx + 1);
      if (!slice.length) {
        return 0;
      }
      return slice.reduce((s, v) => s + v, 0) / slice.length;
    };
    const bankfullMean = meanInWindow(bankfullSeries);
    const moderateMean = meanInWindow(moderateSeries);
    const severeMean = meanInWindow(severeSeries);

    // Build flat series over the window only (nulls elsewhere)
    const flatWindowSeries = (value: number | null) =>
      bankfullSeries.map((_v, idx) =>
        idx >= startIdx && idx <= endIdx ? (value ?? NaN) : NaN,
      );

    return {
      labels,
      datasets: [
        // Thresholds
        {
          label: `${t('Bankfull')} (${bankfullTrigger}%)`,
          data: Array.from({ length: labels.length }, () => bankfullTrigger),
          borderColor: 'rgba(102, 187, 106, 0.7)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false,
        },
        {
          label: `${t('Moderate')} (${moderateTrigger}%)`,
          data: Array.from({ length: labels.length }, () => moderateTrigger),
          borderColor: 'rgba(255, 167, 38, 0.8)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false,
        },
        {
          label: `${t('Severe')} (${severeTrigger}%)`,
          data: Array.from({ length: labels.length }, () => severeTrigger),
          borderColor: 'rgba(239, 83, 80, 0.8)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false,
        },
        // Normal lines (no fill)
        {
          label: t('Bankfull'),
          data: bankfullSeries,
          borderColor: 'rgba(102, 187, 106, 0.8)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Moderate'),
          data: moderateSeries,
          borderColor: 'rgba(255, 167, 38, 0.8)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Severe'),
          data: severeSeries,
          borderColor: 'rgba(239, 83, 80, 0.8)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        // Mean lines over window only (no fill)
        {
          label: t('Bankfull mean (window)'),
          data: flatWindowSeries(bankfullMean),
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
          data: flatWindowSeries(moderateMean),
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
          data: flatWindowSeries(severeMean),
          borderColor: 'rgba(239, 83, 80, 1)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0,
          lineTension: 0,
        },
        // Conditional mean-to-threshold fills within the window only if exceeded
        {
          label: t('Bankfull mean fill'),
          data:
            bankfullMean > bankfullTrigger
              ? flatWindowSeries(bankfullMean)
              : flatWindowSeries(null as unknown as number),
          borderColor: 'rgba(0,0,0,0)',
          backgroundColor: 'rgba(102, 187, 106, 0.25)',
          borderWidth: 0,
          pointRadius: 0,
          fill: 0, // fill to Bankfull threshold dataset
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Moderate mean fill'),
          data:
            moderateMean > moderateTrigger
              ? flatWindowSeries(moderateMean)
              : flatWindowSeries(null as unknown as number),
          borderColor: 'rgba(0,0,0,0)',
          backgroundColor: 'rgba(255, 167, 38, 0.25)',
          borderWidth: 0,
          pointRadius: 0,
          fill: 1, // fill to Moderate threshold dataset
          tension: 0,
          lineTension: 0,
        },
        {
          label: t('Severe mean fill'),
          data:
            severeMean > severeTrigger
              ? flatWindowSeries(severeMean)
              : flatWindowSeries(null as unknown as number),
          borderColor: 'rgba(0,0,0,0)',
          backgroundColor: 'rgba(239, 83, 80, 0.25)',
          borderWidth: 0,
          pointRadius: 0,
          fill: 2, // fill to Severe threshold dataset
          tension: 0,
          lineTension: 0,
        },
      ],
    };
  }, [floodState.probabilitiesData, station.station_name, t]);

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
              display: true,
              labelString: t('Lead times (days)'),
            },
            ticks: { maxRotation: 0 },
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
    const probs = floodState.probabilitiesData[station.station_name];
    if (!probs || probs.length === 0) {
      return hydrographOptions;
    }

    const sortedData = sortBy(probs, p => new Date(p.time).getTime());
    const labelStrings = sortedData.map(d =>
      new Date(d.time).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      }),
    );

    const clampIndex = (i: number) =>
      Math.max(0, Math.min(labelStrings.length - 1, i));
    // const forecastBeginIdx = clampIndex(1);
    const startIdx = clampIndex(forecastWindow.start);
    const endIdx = clampIndex(forecastWindow.end);
    // const unreliableIdx = clampIndex(9);

    // Compute y-axis max rounded up to the next dizaine (multiple of 10)
    const maxPct = Math.max(
      50,
      ...sortedData.map(d =>
        Math.max(
          d.bankfull_percentage,
          d.moderate_percentage,
          d.severe_percentage,
        ),
      ),
    );
    const maxTick = Math.ceil((maxPct + 10) / 10) * 10;

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
        annotations: [
          // {
          //   type: 'line',
          //   mode: 'vertical',
          //   scaleID: 'x-axis-0',
          //   value: labelStrings[forecastBeginIdx],
          //   borderColor: 'rgba(158,158,158,0.8)',
          //   borderDash: [4, 4],
          //   borderWidth: 1,
          //   label: {
          //     enabled: true,
          //     position: 'top',
          //     content: t('Forecast period begins'),
          //     backgroundColor: 'rgba(0,0,0,0)',
          //     fontColor: '#9E9E9E',
          //     xAdjust: 8,
          //   },
          // },
          {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x-axis-0',
            value: labelStrings[startIdx],
            borderColor: '#2196F3',
            borderDash: [4, 4],
            borderWidth: 1,
            label: {
              enabled: true,
              position: 'top',
              content: t('{{day}}-day forecast', { day: forecastWindow.start }),
              backgroundColor: 'rgba(0,0,0,0)',
              fontColor: '#2196F3',
              xAdjust: -50,
            },
          },
          {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x-axis-0',
            value: labelStrings[endIdx],
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
          // {
          //   type: 'line',
          //   mode: 'vertical',
          //   scaleID: 'x-axis-0',
          //   value: labelStrings[unreliableIdx],
          //   borderColor: 'rgba(158,158,158,0.8)',
          //   borderDash: [4, 4],
          //   borderWidth: 1,
          //   label: {
          //     enabled: true,
          //     position: 'top',
          //     content: t('Unreliable forecast'),
          //     backgroundColor: 'rgba(0,0,0,0)',
          //     fontColor: '#9E9E9E',
          //     xAdjust: 8,
          //   },
          // },
        ],
      },
    } as any;
  }, [
    floodState.probabilitiesData,
    station.station_name,
    t,
    hydrographOptions,
  ]);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
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

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          className={classes.tabs}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={t('Trigger probability')} />
          <Tab label={t('Hydrograph')} />
        </Tabs>

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
