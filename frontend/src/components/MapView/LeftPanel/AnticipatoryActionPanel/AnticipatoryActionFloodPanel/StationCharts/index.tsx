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
    },
    closeButton: {
      padding: '4px',
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

interface StationChartsProps {
  station: FloodStation;
  onClose?: () => void;
}

function StationCharts({ station, onClose }: StationChartsProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const [activeTab, setActiveTab] = useState(0);

  // Prepare hydrograph data
  const hydrographData = useMemo(() => {
    if (!station.historicalData || station.historicalData.length === 0) {
      return null;
    }

    // Sort data by time manually to avoid fp/no-mutating-methods warning
    const dataArray = [...station.historicalData];
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedData = dataArray.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    return {
      labels: sortedData.map(d => new Date(d.time).toLocaleDateString()),
      datasets: [
        {
          label: t('Discharge (m³/s)'),
          data: sortedData.map(d => d.avg_discharge),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: t('Bankfull Threshold'),
          data: sortedData.map(() => station.thresholds.bankfull),
          borderColor: '#FFC107',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        },
        {
          label: t('Moderate Threshold'),
          data: sortedData.map(() => station.thresholds.moderate),
          borderColor: '#FF9800',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        },
        {
          label: t('Severe Threshold'),
          data: sortedData.map(() => station.thresholds.severe),
          borderColor: '#F44336',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        },
      ],
    };
  }, [station.historicalData, station.thresholds, t]);

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

    return {
      labels: sortedData.map(d => new Date(d.time).toLocaleDateString()),
      datasets: [
        {
          label: t('Bankfull Probability (%)'),
          data: sortedData.map(d => d.bankfull_percentage),
          borderColor: '#FFC107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: t('Moderate Probability (%)'),
          data: sortedData.map(d => d.moderate_percentage),
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: t('Severe Probability (%)'),
          data: sortedData.map(d => d.severe_percentage),
          borderColor: '#F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [station.historicalData, t]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: t('Date'),
        },
      },
      y: {
        display: true,
        beginAtZero: true,
      },
    },
  };

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!station.historicalData || station.historicalData.length === 0) {
    return (
      <div className={classes.container}>
        <Paper className={classes.paper}>
          <div className={classes.header}>
            <Typography className={classes.title}>
              {station.station_name} {t('discharge forecast')}
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
            {station.station_name} {t('discharge forecast')}
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
                <Line data={hydrographData} options={chartOptions as any} />
              )}
            </div>
          )}

          {activeTab === 1 && (
            <div className={classes.chartContainer}>
              {triggerProbabilityData && (
                <Line
                  data={triggerProbabilityData}
                  options={chartOptions as any}
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
