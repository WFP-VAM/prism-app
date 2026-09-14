import 'chartjs-plugin-annotation';

import { Close, GetApp, TableChart } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  AAFloodDataSelector,
  setAAFloodStationDetailActiveTab,
  setAAFloodStationDetailViewMode,
} from 'context/anticipatoryAction/AAFloodStateSlice';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { useSafeTranslation } from 'i18n';
import sortBy from 'lodash/sortBy';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useDispatch, useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';

import { aaStationChartsSx } from '../../aaPanelStyles';
import { AAFloodColors, ForecastWindowPerCountry } from '../constants';

const forecastWindow = ForecastWindowPerCountry.mozambique;

// (removed unused chartFillColor helper)

interface StationChartsProps {
  station: FloodStation;
  onClose?: () => void;
}

function StationCharts({ station, onClose }: StationChartsProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const floodState = useSelector(AAFloodDataSelector);
  const activeTab = floodState.stationDetailActiveTab === 1 ? 1 : 0;
  const viewMode = floodState.stationDetailViewMode ?? 'chart';
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] =
    useState<null | HTMLElement>(null);
  const hydrographChartRef = useRef<Line>(null);
  const probabilityChartRef = useRef<Line>(null);

  if (!station) {
    return null;
  }

  const probs = floodState.probabilitiesData[station.station_name];
  const stationSummary = floodState.stationSummaryData
    ? floodState.stationSummaryData[station.station_name]
    : undefined;

  // Prepare hydrograph data using fetched forecast (discharge) data
  const hydrographData = useMemo(() => {
    const forecast = floodState.forecastData[station.station_name] || [];
    if (!forecast.length) {
      return null;
    }

    // Use valid_time dates for x-axis labels (same as probability format)
    const labels = forecast.map(
      p => getFormattedDate(p.time, 'shortDayFirst') as string,
    );
    // Guard against missing or empty probs array
    if (!probs || !Array.isArray(probs) || probs.length === 0) {
      return null;
    }
    const { thresholdBankfull, thresholdModerate, thresholdSevere } = probs[0];

    const membersCount = forecast[0]?.ensemble_members?.length || 0;
    const ensembleDatasets = Array.from(
      { length: membersCount },
      (_v, mIdx) => ({
        label: `Member ${mIdx + 1}`,
        data: forecast.map(fp => fp.ensemble_members[mIdx] ?? 0),
        borderColor: AAFloodColors.chart.ensemble.border,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line' as const,
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
      const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
      // round to 2 decimal places
      return Math.round(avg * 100) / 100;
    });

    return {
      labels,
      datasets: [
        {
          label: t('Ensemble Mean'),
          data: meanSeries,
          borderColor: AAFloodColors.chart.ensemble.mean,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointStyle: 'line' as const,
          fill: false,
          tension: 0.4,
        },
        {
          label: `${t('Bankfull threshold')}`,
          data: Array.from({ length: labels.length }, () => thresholdBankfull),
          borderColor: AAFloodColors.chart.bankfull.solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as const,
        },
        {
          label: `${t('Moderate threshold')}`,
          data: Array.from({ length: labels.length }, () => thresholdModerate),
          borderColor: AAFloodColors.chart.moderate.solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as const,
        },
        {
          label: `${t('Severe threshold')}`,
          data: Array.from({ length: labels.length }, () => thresholdSevere),
          borderColor: AAFloodColors.chart.severe.solid,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as const,
        },
        ...ensembleDatasets,
      ],
    };
  }, [floodState.forecastData, station.station_name, probs, t]);

  const beginIdx = forecastWindow.start - 1;
  const endIdx = forecastWindow.end - 1;

  // Prepare trigger probability data from fetched probabilities
  const sortedData = sortBy(probs, p => new Date(p.time).getTime());
  const labels = sortedData.map(
    d => getFormattedDate(d.time, 'shortDayFirst') as string,
  );

  const triggerProbabilityData = useMemo(() => {
    if (!probs || probs.length === 0) {
      return null;
    }

    const bankfullSeries = sortedData.map(d => d.bankfullPercentage);
    const moderateSeries = sortedData.map(d => d.moderatePercentage);
    const severeSeries = sortedData.map(d => d.severePercentage);

    // Use averaged window means and triggers from station_summary_file.csv
    const bankfullMean = stationSummary?.avg_bankfull_percentage ?? 0;
    const moderateMean = stationSummary?.avg_moderate_percentage ?? 0;
    const severeMean = stationSummary?.avg_severe_percentage ?? 0;

    // Build flat series over the window only (NaN elsewhere)
    const flatWindowSeries = (value: number | null) =>
      bankfullSeries.map((_v, idx) =>
        beginIdx >= 0 && endIdx >= 0 && idx >= beginIdx && idx <= endIdx
          ? (value ?? NaN)
          : NaN,
      );

    // Only show mean fill for the highest severity exceeded
    const bankfullExceeded =
      typeof stationSummary?.trigger_bankfull === 'number' &&
      bankfullMean > stationSummary.trigger_bankfull;
    const moderateExceeded =
      typeof stationSummary?.trigger_moderate === 'number' &&
      moderateMean > stationSummary.trigger_moderate;
    const severeExceeded =
      typeof stationSummary?.trigger_severe === 'number' &&
      severeMean > stationSummary.trigger_severe;

    const fillDatasets: any[] = (() => {
      if (severeExceeded) {
        return [
          {
            label: t('Severe mean fill'),
            data: flatWindowSeries(severeMean),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(230, 55, 1, 0.25)',
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
            data: flatWindowSeries(moderateMean),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(255, 140, 33, 0.25)',
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
            data: flatWindowSeries(bankfullMean),
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(255, 204, 0, 0.25)',
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
      stationSummary?.trigger_bankfull !== undefined && {
        label: `${t('Bankfull')} ${t('threshold')}`,
        data: Array.from(
          { length: labels.length },
          () => stationSummary!.trigger_bankfull as number,
        ),
        borderColor: 'rgba(255, 204, 0, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      },
      stationSummary?.trigger_moderate !== undefined && {
        label: `${t('Moderate')} ${t('threshold')}`,
        data: Array.from(
          { length: labels.length },
          () => stationSummary!.trigger_moderate as number,
        ),
        borderColor: 'rgba(255, 140, 33, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      },
      stationSummary?.trigger_severe !== undefined && {
        label: `${t('Severe')} ${t('threshold')}`,
        data: Array.from(
          { length: labels.length },
          () => stationSummary!.trigger_severe as number,
        ),
        borderColor: 'rgba(230, 55, 1, 0.8)',
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
          borderColor: AAFloodColors.chart.bankfull.transparent,
          backgroundColor: AAFloodColors.chart.bankfull.transparent,
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
          borderColor: AAFloodColors.chart.moderate.transparent,
          backgroundColor: AAFloodColors.chart.moderate.transparent,
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
          borderColor: AAFloodColors.chart.severe.transparent,
          backgroundColor: AAFloodColors.chart.severe.transparent,
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
          data: flatWindowSeries(bankfullMean),
          borderColor: AAFloodColors.chart.bankfull.solid,
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
          borderColor: AAFloodColors.chart.moderate.solid,
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
          borderColor: AAFloodColors.chart.severe.solid,
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
  }, [probs, stationSummary, sortedData, t, labels, beginIdx, endIdx]);

  const hydrographOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        point: {
          // Improve hoverability without showing points
          hitRadius: 8,
        },
      },
      tooltips: {
        mode: 'index' as const,
        intersect: false,
        // Hide ensemble members from tooltips
        filter: (tooltipItem: any, data: any) => {
          const datasetLabel = String(
            data?.datasets?.[tooltipItem.datasetIndex]?.label ?? '',
          );
          return !/^Member\s\d+$/i.test(datasetLabel);
        },
        callbacks: {
          // Add min and max values to the tooltip
          afterBody: (items: any[]) => {
            if (!items || !items.length) {
              return [] as string[];
            }
            const idx = items[0].index as number;
            const p = (floodState.forecastData[station.station_name] || [])[
              idx
            ];
            const arr: number[] = p?.ensemble_members || [];
            if (!arr.length) {
              return [] as string[];
            }
            const min = Math.min(...arr).toFixed(2);
            const max = Math.max(...arr).toFixed(2);
            return [
              `${String(t('Min'))}: ${min}`,
              `${String(t('Max'))}: ${max}`,
            ];
          },
        },
      },
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
    [t, floodState.forecastData, station.station_name],
  );

  const probabilityOptions = useMemo(() => {
    if (!probs || probs.length === 0) {
      return hydrographOptions;
    }

    // Compute y-axis max rounded up to the next dizaine (multiple of 10)
    const triggerPcts = [
      stationSummary?.trigger_bankfull,
      stationSummary?.trigger_moderate,
      stationSummary?.trigger_severe,
    ].filter((v): v is number => typeof v === 'number');
    const maxPct = Math.max(
      50,
      ...triggerPcts,
      ...probs.map(d =>
        Math.max(
          d.bankfullPercentage,
          d.moderatePercentage,
          d.severePercentage,
        ),
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
              borderColor: AAFloodColors.annotation.forecastStart,
              borderDash: [4, 4],
              borderWidth: 1,
              label: {
                enabled: true,
                position: 'top',
                content: t('{{day}}-day forecast', {
                  day: forecastWindow.start,
                }),
                backgroundColor: 'rgba(0,0,0,0)',
                fontColor: AAFloodColors.annotation.forecastStart,
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
              borderColor: AAFloodColors.annotation.forecastEnd,
              borderDash: [4, 4],
              borderWidth: 1,
              label: {
                enabled: true,
                position: 'top',
                content: t('{{day}}-day forecast', { day: forecastWindow.end }),
                backgroundColor: 'rgba(0,0,0,0)',
                fontColor: AAFloodColors.annotation.forecastEnd,
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
  }, [probs, stationSummary, labels, beginIdx, endIdx, t, hydrographOptions]);

  const handleTabChange = (newValue: number) => {
    dispatch(setAAFloodStationDetailActiveTab(newValue));
    dispatch(setAAFloodStationDetailViewMode('chart'));
  };

  const toggleViewMode = () => {
    dispatch(
      setAAFloodStationDetailViewMode(viewMode === 'chart' ? 'table' : 'chart'),
    );
  };

  const openDownloadMenu = (event: ReactMouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const closeDownloadMenu = () => setDownloadMenuAnchor(null);

  const downloadChart = () => {
    const chartRef = activeTab === 1 ? hydrographChartRef : probabilityChartRef;
    const chartName = activeTab === 1 ? 'Hydrograph' : 'Trigger Probability';
    const { chartInstance } = chartRef.current ?? ({} as any);

    if (chartInstance && chartInstance.ctx) {
      const base64Image = chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.setAttribute('href', base64Image);
      link.setAttribute('download', `${station.station_name}_${chartName}.png`);
      link.click();
    } else {
      console.error('Chart instance not available for download');
    }
  };

  const downloadTable = () => {
    const tableName = activeTab === 1 ? 'Hydrograph' : 'Trigger_Probability';
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
      link.setAttribute('download', `${station.station_name}_${tableName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.error('Table data not available for download');
    }
  };

  const hydrographTableData = useMemo(() => {
    const fc = floodState.forecastData[station.station_name] ?? [];
    const hd = hydrographData;

    if (!hd?.datasets?.length || !fc.length) {
      return null;
    }
    const [
      ensembleMean,
      bankfullThreshold,
      moderateThreshold,
      severeThreshold,
    ] = hd.datasets;
    // get minimum and maximum ensemble member values
    const ensembleMin = fc.map(p =>
      p?.ensemble_members?.length
        ? Math.round(Math.min(...p.ensemble_members) * 100) / 100
        : null,
    );
    const ensembleMax = fc.map(p =>
      p?.ensemble_members?.length
        ? Math.round(Math.max(...p.ensemble_members) * 100) / 100
        : null,
    );
    // create hydrograph table
    const columns = [
      t('Day'),
      ensembleMean?.label || t('Ensemble Mean'),
      t('Min'),
      t('Max'),
      bankfullThreshold?.label || t('Bankfull threshold'),
      moderateThreshold?.label || t('Moderate threshold'),
      severeThreshold?.label || t('Severe threshold'),
    ];

    const cell = (v: number | null | undefined) =>
      v === null || v === undefined || Number.isNaN(Number(v)) ? '-' : v;

    const rows = (hd.labels as string[]).map((label, i) => [
      label ?? '',
      cell(ensembleMean?.data?.[i]),
      cell(ensembleMin[i]),
      cell(ensembleMax[i]),
      cell(bankfullThreshold?.data?.[i]),
      cell(moderateThreshold?.data?.[i]),
      cell(severeThreshold?.data?.[i]),
    ]);

    return { columnNames: columns, tableValues: rows };
  }, [hydrographData, floodState.forecastData, station.station_name, t]);

  const triggerProbabilityTableData = useMemo(() => {
    if (!triggerProbabilityData || !triggerProbabilityData.datasets) {
      return null;
    }

    // Filter out mean fill datasets from table view
    const tableDatasets = triggerProbabilityData.datasets.filter(
      dataset => !dataset.label?.includes('mean fill'),
    );

    const columnNames = [t('Date'), ...tableDatasets.map(d => d.label || '')];

    const tableValues = (triggerProbabilityData.labels as string[]).map(
      (rowLabel, rowIndex: number) => [
        rowLabel ?? '',
        ...tableDatasets.map(dataset => {
          const value = dataset.data?.[rowIndex];
          return value ? `${Number(value).toFixed(1)}%` : '-';
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
      <Box sx={aaStationChartsSx.container}>
        <Paper sx={aaStationChartsSx.paper}>
          <Box sx={aaStationChartsSx.header}>
            <Typography sx={aaStationChartsSx.title}>
              {station.station_name}
            </Typography>
            {onClose && (
              <IconButton
                sx={aaStationChartsSx.closeButton}
                onClick={onClose}
                size="small"
              >
                <Close />
              </IconButton>
            )}
          </Box>
          <Box sx={aaStationChartsSx.tabPanel}>
            <Typography sx={aaStationChartsSx.noDataMessage}>
              {t('No historical data available for {{station}}', {
                station: station.station_name,
              })}
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={aaStationChartsSx.container}>
      <Paper sx={aaStationChartsSx.paper}>
        <Box sx={aaStationChartsSx.header}>
          <Typography sx={aaStationChartsSx.title}>
            {station.station_name}
          </Typography>
          {onClose && (
            <IconButton
              sx={aaStationChartsSx.closeButton}
              onClick={onClose}
              size="small"
            >
              <Close />
            </IconButton>
          )}
        </Box>

        <Box sx={aaStationChartsSx.tabs}>
          <Button
            disableRipple
            sx={[
              aaStationChartsSx.tab,
              activeTab === 0 && aaStationChartsSx.selectedTab,
            ]}
            onClick={() => handleTabChange(0)}
          >
            {t('Trigger probability')}
          </Button>
          <Button
            disableRipple
            sx={[
              aaStationChartsSx.tab,
              activeTab === 1 && aaStationChartsSx.selectedTab,
            ]}
            onClick={() => handleTabChange(1)}
          >
            {t('Hydrograph')}
          </Button>
        </Box>

        <Box sx={aaStationChartsSx.tabPanel}>
          {activeTab === 1 && (
            <>
              <Box
                sx={aaStationChartsSx.chartContainer}
                style={{ display: viewMode === 'chart' ? 'block' : 'none' }}
              >
                {hydrographData && (
                  <Line
                    ref={hydrographChartRef}
                    data={hydrographData}
                    options={hydrographOptions as any}
                  />
                )}
                {isDownloading && (
                  <Box sx={aaStationChartsSx.loadingOverlay}>
                    <CircularProgress />
                    <Typography variant="body2">
                      {t('Preparing chart for download...')}
                    </Typography>
                  </Box>
                )}
              </Box>
              <TableContainer
                sx={aaStationChartsSx.tableContainer}
                key={`hydrograph-table-${station.station_name}`}
                style={{ display: viewMode === 'table' ? 'block' : 'none' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {hydrographTableData?.columnNames.map(columnName => (
                        <TableCell
                          key={columnName}
                          sx={[
                            aaStationChartsSx.tableCell,
                            aaStationChartsSx.tableHeader,
                          ]}
                        >
                          {columnName}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hydrographTableData?.tableValues.map((row, rowIndex) => (
                      <TableRow key={`hydrograph-row-${row[0] || rowIndex}`}>
                        {row.map((cellValue, cellIndex) => (
                          <TableCell
                            key={`hydrograph-cell-${row[0] || rowIndex}-${cellIndex}`}
                            sx={aaStationChartsSx.tableCell}
                          >
                            {cellValue}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {activeTab === 0 && (
            <>
              <Box
                sx={aaStationChartsSx.chartContainer}
                style={{ display: viewMode === 'chart' ? 'block' : 'none' }}
              >
                {triggerProbabilityData && (
                  <Line
                    ref={probabilityChartRef}
                    data={triggerProbabilityData}
                    options={probabilityOptions as any}
                  />
                )}
                {isDownloading && (
                  <Box sx={aaStationChartsSx.loadingOverlay}>
                    <CircularProgress />
                    <Typography variant="body2">
                      {t('Preparing chart for download...')}
                    </Typography>
                  </Box>
                )}
              </Box>
              <TableContainer
                sx={aaStationChartsSx.tableContainer}
                key={`trigger-probability-table-${station.station_name}`}
                style={{ display: viewMode === 'table' ? 'block' : 'none' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {triggerProbabilityTableData?.columnNames.map(
                        columnName => (
                          <TableCell
                            key={columnName}
                            sx={[
                              aaStationChartsSx.tableCell,
                              aaStationChartsSx.tableHeader,
                            ]}
                          >
                            {columnName}
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody
                    key={`trigger-probability-table-body-${station.station_name}`}
                  >
                    {triggerProbabilityTableData?.tableValues.map(
                      (row, rowIndex) => (
                        <TableRow key={`probability-row-${row[0] || rowIndex}`}>
                          {row.map((cellValue, cellIndex) => (
                            <TableCell
                              key={`probability-cell-${row[0] || rowIndex}-${cellIndex}`}
                              sx={aaStationChartsSx.tableCell}
                            >
                              {cellValue}
                            </TableCell>
                          ))}
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>

        <Box sx={aaStationChartsSx.actionButtons}>
          <Button
            sx={aaStationChartsSx.actionButton}
            type="button"
            startIcon={<TableChart />}
            onClick={toggleViewMode}
          >
            {viewMode === 'chart' ? t('View table') : t('View chart')}
          </Button>
          <Button
            sx={aaStationChartsSx.actionButton}
            type="button"
            startIcon={
              isDownloading ? <CircularProgress size={16} /> : <GetApp />
            }
            onClick={openDownloadMenu}
            disabled={isDownloading}
          >
            {isDownloading ? t('Downloading...') : t('Download')}
          </Button>
          <Menu
            anchorEl={downloadMenuAnchor}
            keepMounted
            open={Boolean(downloadMenuAnchor)}
            onClose={closeDownloadMenu}
          >
            <MenuItem
              onClick={async () => {
                if (isDownloading) {
                  return;
                }
                setIsDownloading(true);
                closeDownloadMenu();
                await downloadChart();
                setIsDownloading(false);
              }}
            >
              {t('Download PNG')}
            </MenuItem>
            <MenuItem
              onClick={async () => {
                if (isDownloading) {
                  return;
                }
                setIsDownloading(true);
                closeDownloadMenu();
                await downloadTable();
                setIsDownloading(false);
              }}
            >
              {t('Download CSV')}
            </MenuItem>
          </Menu>
        </Box>
      </Paper>
    </Box>
  );
}

export default StationCharts;
