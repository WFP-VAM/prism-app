import { useMemo } from 'react';
import { Typography, Box, makeStyles, createStyles } from '@material-ui/core';
import { Line } from 'react-chartjs-2';
import { useSafeTranslation } from 'i18n';
import { FloodStation } from 'context/anticipatoryAction/AAFloodStateSlice/types';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      padding: '1rem',
      marginTop: '1rem',
    },
    chartContainer: {
      marginBottom: '2rem',
    },
    chartTitle: {
      marginBottom: '1rem',
      fontWeight: 'bold',
      fontSize: '1.1rem',
    },
    noDataMessage: {
      textAlign: 'center',
      color: '#666',
      fontStyle: 'italic',
      padding: '2rem',
    },
  }),
);

interface StationChartsProps {
  station: FloodStation;
}

function StationCharts({ station }: StationChartsProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

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

  if (!station.historicalData || station.historicalData.length === 0) {
    return (
      <Box className={classes.container}>
        <Typography className={classes.noDataMessage}>
          {t('No historical data available for {{station}}', {
            station: station.station_name,
          })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={classes.container}>
      <Typography variant="h6" className={classes.chartTitle}>
        {t('Charts for {{station}}', { station: station.station_name })}
      </Typography>

      {/* Hydrograph Chart */}
      <Box className={classes.chartContainer}>
        <Typography variant="subtitle1" className={classes.chartTitle}>
          {t('Hydrograph - Discharge Over Time')}
        </Typography>
        {hydrographData && (
          <Box style={{ height: '300px' }}>
            <Line data={hydrographData} options={chartOptions as any} />
          </Box>
        )}
      </Box>

      {/* Trigger Probability Chart */}
      <Box className={classes.chartContainer}>
        <Typography variant="subtitle1" className={classes.chartTitle}>
          {t('Trigger Probability Over Time')}
        </Typography>
        {triggerProbabilityData && (
          <Box style={{ height: '300px' }}>
            <Line data={triggerProbabilityData} options={chartOptions as any} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default StationCharts;
