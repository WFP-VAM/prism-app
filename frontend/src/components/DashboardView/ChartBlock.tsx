import { useEffect, useState } from 'react';
import {
  Box,
  makeStyles,
  Typography,
  CircularProgress,
  Button,
} from '@material-ui/core';
import {
  DashboardChartConfig,
  AdminLevelType,
  DashboardMode,
} from 'config/types';
import { useChartForm, useChartData } from 'utils/chart-hooks';
import Chart from 'components/Common/Chart';
import {
  ChartLayerSelector,
  ChartDateRangeSelector,
  ChartLocationSelector,
} from 'components/Common/ChartFormComponents';
import { useSafeTranslation } from 'i18n';

interface ChartBlockProps extends Partial<DashboardChartConfig> {
  index: number;
  mode?: DashboardMode;
}

function ChartBlock({
  index,
  startDate: initialStartDate,
  endDate: initialEndDate,
  wmsLayerId: initialChartLayerId,
  adminUnitLevel: initialAdminLevel,
  mode = DashboardMode.EDIT,
}: ChartBlockProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const formState = useChartForm({
    initialChartLayerId,
    initialStartDate,
    initialEndDate,
    initialAdminLevel: initialAdminLevel as AdminLevelType | undefined,
  });

  const { chartDataset, isLoading, error, chartConfig, chartTitle, refetch } =
    useChartData({
      chartLayer: formState.selectedChartLayer,
      adminProperties: formState.adminProperties,
      adminLevel: formState.adminLevel,
      startDate: formState.startDate,
      endDate: formState.endDate,
      enabled: !!formState.chartLayerId,
    });

  // Form changes tracking for edit mode
  const [hasFormChanged, setHasFormChanged] = useState(false);
  const [wasChartLoading, setWasChartLoading] = useState(false);

  useEffect(() => {
    if (!formState.chartLayerId) {
      return;
    }
    setHasFormChanged(true);
  }, [
    formState.chartLayerId,
    formState.startDate,
    formState.endDate,
    formState.adminLevel,
  ]);

  // Reset form changed flag when chart loads successfully
  useEffect(() => {
    if (isLoading !== wasChartLoading) {
      setWasChartLoading(isLoading);

      if (wasChartLoading && !isLoading && chartDataset) {
        setHasFormChanged(false);
      }
    }
  }, [isLoading, wasChartLoading, chartDataset]);

  const formatDateRange = () => {
    const start = formState.startDate;
    const end = formState.endDate;

    if (!start || !end) {
      return '';
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const startStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const endStr = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    return `${startStr} - ${endStr}`;
  };

  if (mode === DashboardMode.PREVIEW) {
    return (
      <Box className={classes.previewContainer}>
        {formState.selectedChartLayer ? (
          <>
            <Box className={classes.previewHeader}>
              <Typography variant="h2" className={classes.previewTitle}>
                {t(chartTitle)}
              </Typography>
              <Typography variant="body1" className={classes.previewDate}>
                {formatDateRange()}
              </Typography>
            </Box>

            {isLoading && (
              <Box className={classes.loadingContainer}>
                <CircularProgress size={40} />
                <Typography variant="body2" style={{ marginTop: 16 }}>
                  {t('Loading chart data...')}
                </Typography>
              </Box>
            )}

            {error && (
              <Box className={classes.errorContainer}>
                <Typography color="error" variant="body1">
                  {error}
                </Typography>
              </Box>
            )}

            {!isLoading && !error && chartDataset && chartConfig && (
              <Box className={classes.chartWrapper}>
                <Chart
                  title={t(chartTitle)}
                  config={chartConfig}
                  data={chartDataset}
                  datasetFields={
                    formState.selectedChartLayer?.chartData?.fields
                  }
                  notMaintainAspectRatio
                  legendAtBottom
                  showDownloadIcons={false}
                />
              </Box>
            )}

            {!isLoading && !error && !chartDataset && (
              <Box className={classes.emptyState}>
                <Typography variant="body1" color="textSecondary">
                  {formState.selectedChartLayer?.chartData
                    ? t('No chart data available')
                    : t(
                        'This layer is not configured for charts. Please select a layer with chart data.',
                      )}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Box className={classes.emptyState}>
            <Typography variant="body1" color="textSecondary" align="center">
              {t('No chart configured')}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }
  // Render small preview chart for edit mode
  const renderEditPreviewChart = () => {
    if (isLoading) {
      return (
        <Box className={classes.smallLoadingContainer}>
          <CircularProgress size={30} />
          <Typography variant="body2" style={{ marginTop: 8 }}>
            {t('Loading...')}
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box className={classes.smallErrorContainer}>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      );
    }

    if (!chartDataset || !chartConfig) {
      return (
        <Box className={classes.smallEmptyState}>
          <Typography variant="body2" color="textSecondary">
            {formState.chartLayerId
              ? t('Configure parameters to see chart preview')
              : t('Select a chart layer to start')}
          </Typography>
        </Box>
      );
    }

    return (
      <Box className={classes.smallChartWrapper}>
        <Chart
          title={t(chartTitle)}
          config={chartConfig}
          data={chartDataset}
          datasetFields={formState.selectedChartLayer?.chartData?.fields}
          notMaintainAspectRatio
          legendAtBottom
          showDownloadIcons={false}
        />
      </Box>
    );
  };

  // Edit mode rendering
  return (
    <Box className={classes.grayCard}>
      <Typography variant="h3" className={classes.blockTitle}>
        {t('Chart Block')} #{index + 1}
      </Typography>

      <Box className={classes.formContainer}>
        <Box className={classes.formSection}>
          <ChartLayerSelector
            value={formState.chartLayerId}
            onChange={formState.setChartLayerId}
          />
        </Box>

        <Box className={classes.formSection}>
          <ChartDateRangeSelector
            startDate={formState.startDate}
            endDate={formState.endDate}
            onStartDateChange={formState.setStartDate}
            onEndDateChange={formState.setEndDate}
          />
          <ChartLocationSelector
            boundaryLayerData={formState.boundaryLayerData?.data}
            boundaryLayer={formState.boundaryLayer}
            admin1Key={formState.admin1Key}
            admin2Key={formState.admin2Key}
            onAdmin1Change={(key, properties, level) => {
              formState.setLocation(key, '' as any, properties, level);
            }}
            onAdmin2Change={(key, properties, level) => {
              formState.setLocation(
                formState.admin1Key,
                key,
                properties,
                level,
              );
            }}
          />
          {hasFormChanged && formState.chartLayerId && (
            <Box className={classes.rerunRow}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => refetch().catch(console.error)}
                disabled={isLoading}
                className={classes.rerunButton}
              >
                {t('Rerun Chart')}
              </Button>
            </Box>
          )}
        </Box>

        {/* Small preview section */}
        {formState.chartLayerId && (
          <Box className={classes.previewSection}>
            {renderEditPreviewChart()}
          </Box>
        )}
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    minHeight: 400,
    display: 'flex',
    flexDirection: 'column',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  previewTitle: {
    flex: 1,
    marginRight: theme.spacing(2),
  },
  previewDate: {
    whiteSpace: 'nowrap',
  },
  blockTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  formContainer: {
    background: 'white',
    borderRadius: 4,
    padding: theme.spacing(2),
    paddingTop: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    marginTop: theme.spacing(1),
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  rerunRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(2),
    alignItems: 'flex-end',
    justifyContent: 'center',
    '& > *:first-child': {
      flex: 1,
    },
  },
  rerunButton: {
    height: 40,
    minWidth: 140,
    marginBottom: theme.spacing(4),
    whiteSpace: 'nowrap',
  },
  previewSection: {
    marginTop: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    flex: 1,
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    flex: 1,
  },
  chartWrapper: {
    flex: 1,
    minHeight: 300,
    display: 'flex',
    flexDirection: 'column',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    minHeight: 200,
  },
  // Small preview styles for edit mode
  smallChartWrapper: {
    height: 240,
    display: 'flex',
    flexDirection: 'column',
  },
  smallLoadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
    height: 240,
  },
  smallErrorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
    height: 240,
  },
  smallEmptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 240,
    textAlign: 'center',
  },
}));

export default ChartBlock;
