import React, { useMemo, useState } from 'react';
import {
  Typography,
  makeStyles,
  createStyles,
  Tabs,
  Tab,
  IconButton,
  Paper,
  Button,
} from '@material-ui/core';
import { Close, Fullscreen, TableChart, GetApp } from '@material-ui/icons';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import { useSafeTranslation } from 'i18n';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { CHART_WIDTH, TABLE_WIDTH } from '../constants';

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
  }),
);

// Helper to fill area above threshold only (Chart.js v2 scriptable backgroundColor)
const chartFillColor =
  (threshold: number | null, above: string, below: string) =>
  ({ chart }: any) => {
    const yScale = (chart as any).scales['y-axis-0'] || (chart as any).scales.y;
    if (!yScale) {
      return below;
    }
    const maxValue = yScale.max !== undefined ? yScale.max : 100;
    const top = yScale.getPixelForValue(maxValue);
    const zero = yScale.getPixelForValue(threshold ?? 0);
    const bottom = yScale.getPixelForValue(0);
    const { ctx } = chart as any;
    if (!ctx) {
      return below;
    }
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    const denom = bottom - top || 1;
    const ratio = Math.min(Math.max((zero - top) / denom, 0), 1);
    if (threshold !== null) {
      gradient.addColorStop(0, above);
      gradient.addColorStop(ratio, above);
      gradient.addColorStop(ratio, below);
      gradient.addColorStop(1, below);
    } else {
      gradient.addColorStop(0, below);
      gradient.addColorStop(1, below);
    }
    return gradient as CanvasGradient;
  };

interface StationChartsProps {
  station: FloodStation;
  onClose?: () => void;
}

function StationCharts({ station, onClose }: StationChartsProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const [activeTab, setActiveTab] = useState(0);

  // Prepare hydrograph data (synthetic around bankfull threshold)
  const hydrographData = useMemo(() => {
    const days = 11; // 0..10 days lead time
    const labels = Array.from({ length: days }, (_v, i) => `${i}`);

    const { bankfull, moderate, severe } = station.thresholds;

    // Create a simple rise to a peak at day 3, then gradual fall
    const meanSeries = Array.from({ length: days }, (_v, i) => {
      const riseRatio = Math.min(i / 3, 1); // 0 -> 1 by day 3
      const fallRatio = i > 3 ? (i - 3) / 7 : 0; // 0 at day 3 -> 1 at day 10
      const value = bankfull * (0.95 + riseRatio * 0.12 - fallRatio * 0.17);
      return Number(value.toFixed(1));
    });

    // Generate synthetic ensemble members around the mean
    const numMembers = 50;
    const ensembleDatasets = Array.from({ length: numMembers }, (_v, idx) => {
      // Add more variability: per-member offset and a small random walk over time
      const offset = (Math.random() - 0.5) * 0.18; // ±9%
      const steps = Array.from(
        { length: days },
        () => (Math.random() - 0.5) * 0.08,
      );
      const walkSeries = steps.reduce<number[]>((acc, step) => {
        const previous = acc.length ? acc[acc.length - 1] : 0;
        const next = Math.max(-0.12, Math.min(0.12, previous + step));
        return [...acc, next];
      }, []);
      const memberSeries = meanSeries.map((v, i) => {
        const local = (Math.random() - 0.5) * 0.1; // extra local jitter ±5%
        const factor = 1 + offset + walkSeries[i] + local;
        const value = Math.max(0, v * factor);
        return Number(value.toFixed(1));
      });
      return {
        label: `Member ${idx + 1}`,
        data: memberSeries,
        borderColor: 'rgba(0, 0, 0, 0.18)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line' as any,
        hoverRadius: 0,
        fill: false,
        tension: 0.35,
      };
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
          data: Array.from({ length: days }, () => bankfull),
          borderColor: '#66BB6A',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as any,
        },
        {
          label: `${t('Moderate')} (${moderate})`,
          data: Array.from({ length: days }, () => moderate),
          borderColor: '#FFA726',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointStyle: 'line' as any,
        },
        {
          label: `${t('Severe')} (${severe})`,
          data: Array.from({ length: days }, () => severe),
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
  }, [station.thresholds, t]);

  // Prepare trigger probability data
  const triggerProbabilityData = useMemo(() => {
    if (!station.historicalData || station.historicalData.length === 0) {
      return null;
    }

    // Sort data by time manually to avoid fp/no-mutating-methods warning
    const dataArray = [...station.historicalData];
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedData = dataArray.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    // TODO - remove temp synthetic data
    const labels = sortedData.map(d => new Date(d.time).toLocaleDateString());
    const bankfullSeries = sortedData
      .map(d => d.bankfull_percentage)
      .map((v, i) => (i >= 3 ? 50 : v));
    const moderateSeries = sortedData
      .map(d => d.moderate_percentage)
      .map((v, i) => (i >= 3 ? 24 : v));
    const severeSeries = sortedData
      .map(d => d.severe_percentage)
      .map((v, i) => (i <= 4 ? 15 : v));

    const bankfullTrigger = 38;
    const moderateTrigger = 19;
    const severeTrigger = 10;

    // Area fill handled by scriptable backgroundColor; no clamped series needed

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
        // Area fill only above the bankfull threshold using scriptable background
        {
          label: t('Bankfull'),
          data: bankfullSeries,
          borderColor: 'rgba(102, 187, 106, 0.8)',
          backgroundColor: chartFillColor(
            bankfullTrigger,
            'rgba(102, 187, 106, 0.25)',
            'rgba(0,0,0,0)',
          ),
          borderWidth: 0,
          pointRadius: 0,
          fill: true,
          tension: 0,
          lineTension: 0,
        },
        // Moderate area and line
        {
          label: t('Moderate'),
          data: moderateSeries,
          borderColor: 'rgba(255, 167, 38, 0.8)',
          backgroundColor: chartFillColor(
            moderateTrigger,
            'rgba(255, 167, 38, 0.25)',
            'rgba(0,0,0,0)',
          ),
          borderWidth: 0,
          pointRadius: 0,
          fill: true,
          tension: 0,
          lineTension: 0,
        },
        // Severe area and line
        {
          label: t('Severe'),
          data: severeSeries,
          borderColor: 'rgba(239, 83, 80, 0.8)',
          backgroundColor: chartFillColor(
            severeTrigger,
            'rgba(239, 83, 80, 0.25)',
            'rgba(0,0,0,0)',
          ),
          borderWidth: 0,
          pointRadius: 0,
          fill: true,
          tension: 0,
          lineTension: 0,
        },
      ],
    };
  }, [station.historicalData, t]);

  const hydrographOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 24,
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
    if (!station.historicalData || station.historicalData.length === 0) {
      return hydrographOptions;
    }

    const dataArray = [...station.historicalData];
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedData = dataArray.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    const labelStrings = sortedData.map(d =>
      new Date(d.time).toLocaleDateString(),
    );

    const clampIndex = (i: number) =>
      Math.max(0, Math.min(labelStrings.length - 1, i));
    // const forecastBeginIdx = clampIndex(1);
    const day3Idx = clampIndex(3);
    const day7Idx = clampIndex(7);
    // const unreliableIdx = clampIndex(9);

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
            ticks: { beginAtZero: true, max: 100 },
            scaleLabel: { display: false },
          },
        ],
      },
      annotation: {
        drawTime: 'beforeDatasetsDraw',
        annotations: [
          // Probability threshold labels (bankfull/moderate/severe)
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y-axis-0',
            value: 38,
            label: {
              enabled: true,
              position: 'right',
              content: `${t('Bankfull')} (38%)`,
              backgroundColor: 'rgba(0,0,0,0)',
              fontColor: 'rgba(102, 187, 106, 0.9)',
              yAdjust: 10,
            },
          },
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y-axis-0',
            value: 19,
            label: {
              enabled: true,
              position: 'right',
              content: `${t('Moderate')} (19%)`,
              backgroundColor: 'rgba(0,0,0,0)',
              fontColor: 'rgba(255, 167, 38, 0.9)',
              yAdjust: 10,
            },
          },
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y-axis-0',
            value: 10,
            label: {
              enabled: true,
              position: 'right',
              content: `${t('Severe')} (10%)`,
              backgroundColor: 'rgba(0,0,0,0)',
              fontColor: 'rgba(239, 83, 80, 0.9)',
              yAdjust: 10,
            },
          },
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
            value: labelStrings[day3Idx],
            borderColor: '#2196F3',
            borderDash: [4, 4],
            borderWidth: 1,
            label: {
              enabled: true,
              position: 'top',
              content: t('3-Day forecast'),
              backgroundColor: 'rgba(0,0,0,0)',
              fontColor: '#2196F3',
              xAdjust: -50,
            },
          },
          {
            type: 'line',
            mode: 'vertical',
            scaleID: 'x-axis-0',
            value: labelStrings[day7Idx],
            borderColor: '#9C27B0',
            borderDash: [4, 4],
            borderWidth: 1,
            label: {
              enabled: true,
              position: 'top',
              content: t('7-Day forecast'),
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
  }, [station.historicalData, t, hydrographOptions]);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!station.historicalData || station.historicalData.length === 0) {
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
          <Tab label={t('Hydrograph')} />
          <Tab label={t('Trigger probability')} />
        </Tabs>

        <div className={classes.tabPanel}>
          {activeTab === 0 && (
            <div className={classes.chartContainer}>
              {hydrographData && (
                <Line
                  data={hydrographData}
                  options={hydrographOptions as any}
                />
              )}
            </div>
          )}

          {activeTab === 1 && (
            <div className={classes.chartContainer}>
              {triggerProbabilityData && (
                <Line
                  data={triggerProbabilityData}
                  options={probabilityOptions as any}
                />
              )}
            </div>
          )}
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
          >
            {t('View table')}
          </Button>
          <Button
            className={classes.actionButton}
            type="button"
            startIcon={<GetApp />}
          >
            {t('Download')}
          </Button>
        </div>
      </Paper>
    </div>
  );
}

export default StationCharts;
