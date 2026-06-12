import GetAppIcon from '@mui/icons-material/GetApp';
import ImageIcon from '@mui/icons-material/Image';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import Chart from 'components/Common/Chart';
import {
  ChartDateRangeSelector,
  ChartLayerSelector,
  ChartLocationSelector,
} from 'components/Common/ChartFormComponents';
import { buildCsvFileName, downloadToFile } from 'components/MapView/utils';
import {
  AdminCodeString,
  AdminLevelType,
  ChartHeight,
  ChartLatestPeriod,
  DashboardChartConfig,
  DashboardMode,
  LayerKey,
} from 'config/types';
import { GeoJsonProperties } from 'geojson';
import { useSafeTranslation } from 'i18n';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  adminUnitIdFromKeys,
  useChartData,
  useChartForm,
} from 'utils/chart-hooks';
import {
  createCsvDataFromDataKeyMap,
  createDataKeyMap,
  downloadChartsToCsv,
} from 'utils/csv-utils';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';

import {
  dashboardModeSelector,
  selectedDashboardIndexSelector,
  updateBlockConfig,
} from '../../context/dashboardStateSlice';
import BlockPreviewHeader from './BlockPreviewHeader';
import {
  chartBlockChartWrapperSx,
  chartBlockConstrainedChartWrapperSx,
  chartBlockDateRangeLabelSx,
  chartBlockEmptyStateSx,
  chartBlockErrorContainerSx,
  chartBlockFormContainerSx,
  chartBlockFormControlSx,
  chartBlockFormSectionSx,
  chartBlockGrayCardSx,
  chartBlockLatestPeriodRowSx,
  chartBlockLayerSelectorFlexSx,
  chartBlockLayerSelectorRowSx,
  chartBlockLoadingContainerSx,
  chartBlockPeriodControlSx,
  chartBlockPreviewContainerSx,
  chartBlockPreviewSectionSx,
  chartBlockRerunButtonSx,
  chartBlockRerunRowSx,
  chartBlockSmallChartWrapperSx,
  chartBlockSmallEmptyStateSx,
  chartBlockSmallErrorContainerSx,
  chartBlockSmallLoadingContainerSx,
  chartBlockTitleSx,
} from './chartBlockStyles';
import { CHART_HEIGHTS } from './chartConstants';

interface ChartBlockProps extends Partial<DashboardChartConfig> {
  index: number;
  columnIndex: number;
  elementIndex: number;
  allowDownload?: boolean;
  chartHeight?: ChartHeight;
  isOverflowing?: boolean;
  headerSlot?: ReactNode;
}

function ChartBlock({
  index,
  columnIndex,
  elementIndex,
  startDate: initialStartDate,
  endDate: initialEndDate,
  layerId: initialChartLayerId,
  adminUnitLevel: initialAdminLevel,
  adminUnitId: initialAdminUnitId,
  useLatestAvailableDate: initialUseLatestAvailableDate,
  latestPeriod: initialLatestPeriod,
  allowDownload,
  chartHeight: initialChartHeight,
  isOverflowing,
  headerSlot,
}: ChartBlockProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const mode = useSelector(dashboardModeSelector);
  const selectedDashboardIndex = useSelector(selectedDashboardIndexSelector);
  const chartRef = useRef<any>(null);

  const [useLatest, setUseLatest] = useState(
    initialUseLatestAvailableDate ?? false,
  );
  const [period, setPeriod] = useState<ChartLatestPeriod>(
    initialLatestPeriod ?? ChartLatestPeriod.MONTH,
  );

  useEffect(() => {
    setUseLatest(initialUseLatestAvailableDate ?? false);
    setPeriod(initialLatestPeriod ?? ChartLatestPeriod.MONTH);
  }, [
    initialUseLatestAvailableDate,
    initialLatestPeriod,
    selectedDashboardIndex,
  ]);

  const formState = useChartForm({
    initialChartLayerId,
    initialStartDate,
    initialEndDate,
    initialAdminLevel: initialAdminLevel as AdminLevelType | undefined,
    initialAdminUnitId,
    useLatestAvailableDate: useLatest,
    latestPeriod: period,
  });

  const persistBlockConfig = (updates: Partial<DashboardChartConfig>) => {
    dispatch(
      updateBlockConfig({
        columnIndex,
        elementIndex,
        updates,
      }),
    );
  };

  const handlePeriodChange = (newPeriod: ChartLatestPeriod) => {
    setPeriod(newPeriod);
    persistBlockConfig({
      useLatestAvailableDate: useLatest,
      latestPeriod: newPeriod,
    });
  };

  const {
    chartDataset,
    isLoading,
    error,
    chartConfig,
    chartTitle,
    chartSubtitle,
    refetch,
  } = useChartData({
    chartLayer: formState.selectedChartLayer,
    adminProperties: formState.adminProperties,
    adminLevel: formState.adminLevel,
    startDate: formState.startDate,
    endDate: formState.endDate,
    enabled:
      !!formState.chartLayerId && (!useLatest || formState.isLatestDateReady),
  });

  // Form changes tracking for edit mode
  const [hasFormChanged, setHasFormChanged] = useState(false);
  const [wasChartLoading, setWasChartLoading] = useState(false);
  const [chartHeightOption, setChartHeightOption] = useState<ChartHeight>(
    initialChartHeight || ChartHeight.TALL,
  );

  const handleLayerChange = (id: LayerKey | undefined) => {
    formState.setChartLayerId(id);
    persistBlockConfig({ layerId: id ?? '' });
  };

  const handleStartDateChange = (date: number | null) => {
    formState.setStartDate(date);
    persistBlockConfig({
      startDate: date ? new Date(date).toISOString() : undefined,
    });
  };

  const handleEndDateChange = (date: number | null) => {
    formState.setEndDate(date);
    persistBlockConfig({
      endDate: date ? new Date(date).toISOString() : undefined,
    });
  };

  const handleLocationChange = (
    admin0Key: AdminCodeString,
    admin1Key: AdminCodeString,
    admin2Key: AdminCodeString,
    properties: GeoJsonProperties,
    level: AdminLevelType,
  ) => {
    formState.setLocation(admin0Key, admin1Key, admin2Key, properties, level);
    persistBlockConfig({
      adminUnitLevel: level,
      adminUnitId: adminUnitIdFromKeys(admin0Key, admin1Key, admin2Key, level),
    });
  };

  const handleChartHeightChange = (height: ChartHeight) => {
    setChartHeightOption(height);
    persistBlockConfig({ chartHeight: height });
  };

  const downloadFilename = buildCsvFileName([
    ...(chartTitle ? chartTitle.split(' ') : []),
  ]);

  const handleDownloadPng = () => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    const { canvas } = chart.chartInstance;
    if (!canvas) {
      return;
    }
    const file = canvas.toDataURL('image/png');
    downloadToFile(
      { content: file, isUrl: true },
      downloadFilename,
      'image/png',
    );
  };

  const handleDownloadCsv = () => {
    if (!chartDataset) {
      return;
    }
    const keyMap = formState.selectedChartLayer?.chartData?.fields
      ? createDataKeyMap(
          chartDataset,
          formState.selectedChartLayer.chartData.fields,
        )
      : {};

    downloadChartsToCsv([
      [
        {
          [chartTitle]: createCsvDataFromDataKeyMap(chartDataset, keyMap),
        },
        downloadFilename,
      ],
    ])();
  };

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
    useLatest,
    period,
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

    // Use a locale-aware format so the month name follows the selected language.
    const dateLocale = t('date_locale');
    const startStr = getFormattedDate(
      start,
      DateFormat.DayFirstHyphenMonthName,
      dateLocale,
    );
    const endStr = getFormattedDate(
      end,
      DateFormat.DayFirstHyphenMonthName,
      dateLocale,
    );

    return `${startStr} - ${endStr}`;
  };

  if (mode === DashboardMode.VIEW) {
    const canDownload =
      allowDownload && !isLoading && !error && chartDataset && chartConfig;
    return (
      <Box sx={chartBlockPreviewContainerSx}>
        {formState.selectedChartLayer ? (
          <>
            <BlockPreviewHeader
              title={t(chartTitle)}
              subtitle={formatDateRange()}
              downloadActions={
                canDownload && (
                  <>
                    <Tooltip title={t('Download PNG') as string}>
                      <IconButton onClick={handleDownloadPng} size="small">
                        <ImageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('Download CSV') as string}>
                      <IconButton onClick={handleDownloadCsv} size="small">
                        <GetAppIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )
              }
            />

            {isLoading && (
              <Box sx={chartBlockLoadingContainerSx}>
                <CircularProgress size={40} />
                <Typography variant="body2" style={{ marginTop: 16 }}>
                  {t('Loading chart data...')}
                </Typography>
              </Box>
            )}

            {error && (
              <Box sx={chartBlockErrorContainerSx}>
                <Typography color="error" variant="body1">
                  {error}
                </Typography>
              </Box>
            )}

            {!isLoading && !error && chartDataset && chartConfig && (
              <Box
                sx={
                  isOverflowing
                    ? chartBlockConstrainedChartWrapperSx
                    : chartBlockChartWrapperSx
                }
              >
                <Chart
                  ref={chartRef}
                  title={t(chartSubtitle)}
                  config={chartConfig}
                  data={chartDataset}
                  datasetFields={
                    formState.selectedChartLayer?.chartData?.fields
                  }
                  notMaintainAspectRatio
                  legendAtBottom
                  showDownloadIcons={false}
                  responsive
                  height={
                    isOverflowing ? undefined : CHART_HEIGHTS[chartHeightOption]
                  }
                />
              </Box>
            )}

            {!isLoading && !error && !chartDataset && (
              <Box sx={chartBlockEmptyStateSx}>
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
          <Box sx={chartBlockEmptyStateSx}>
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
        <Box sx={chartBlockSmallLoadingContainerSx}>
          <CircularProgress size={30} />
          <Typography variant="body2" style={{ marginTop: 8 }}>
            {t('Loading...')}
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={chartBlockSmallErrorContainerSx}>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      );
    }

    if (!chartDataset || !chartConfig) {
      return (
        <Box sx={chartBlockSmallEmptyStateSx}>
          <Typography variant="body2" color="textSecondary">
            {formState.chartLayerId
              ? t('Configure parameters to see chart preview')
              : t('Select a chart layer to start')}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={chartBlockSmallChartWrapperSx}>
        <Chart
          title={t(chartTitle)}
          subtitle={t(chartSubtitle)}
          config={chartConfig}
          data={chartDataset}
          datasetFields={formState.selectedChartLayer?.chartData?.fields}
          notMaintainAspectRatio
          legendAtBottom
          showDownloadIcons={false}
          height={CHART_HEIGHTS[chartHeightOption]}
        />
      </Box>
    );
  };

  // Edit mode rendering
  return (
    <Box sx={chartBlockGrayCardSx}>
      {headerSlot ?? (
        <Typography variant="h3" sx={chartBlockTitleSx}>
          {t('Chart Block')} #{index + 1}
        </Typography>
      )}

      <Box sx={chartBlockFormContainerSx}>
        <Box sx={chartBlockFormSectionSx}>
          <Box sx={chartBlockLayerSelectorRowSx}>
            <Box sx={chartBlockLayerSelectorFlexSx}>
              <ChartLayerSelector
                value={formState.chartLayerId}
                onChange={handleLayerChange}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={chartBlockFormSectionSx}>
          {!useLatest && (
            <Typography variant="body2" sx={chartBlockDateRangeLabelSx}>
              {t('Date Range')}
            </Typography>
          )}
          {useLatest ? (
            <Box sx={chartBlockLatestPeriodRowSx}>
              <FormControl variant="outlined" sx={chartBlockPeriodControlSx}>
                <InputLabel>{t('Date Range')}</InputLabel>
                <Select
                  value={period}
                  onChange={e =>
                    handlePeriodChange(e.target.value as ChartLatestPeriod)
                  }
                  label={t('Date Range')}
                >
                  <MenuItem value={ChartLatestPeriod.MONTH}>
                    {t('Last 30 days')}
                  </MenuItem>
                  <MenuItem value={ChartLatestPeriod.QUARTER}>
                    {t('Last 3 months')}
                  </MenuItem>
                  <MenuItem value={ChartLatestPeriod.YEAR}>
                    {t('Last 12 months')}
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          ) : (
            <ChartDateRangeSelector
              startDate={formState.startDate}
              endDate={formState.endDate}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              hideLabel
            />
          )}
          <ChartLocationSelector
            boundaryLayerData={formState.boundaryLayerData?.data}
            boundaryLayer={formState.boundaryLayer}
            admin0Key={formState.admin0Key}
            admin1Key={formState.admin1Key}
            admin2Key={formState.admin2Key}
            labelMarginBottom={8}
            onAdmin0Change={(key, properties, level) => {
              handleLocationChange(
                key,
                '' as AdminCodeString,
                '' as AdminCodeString,
                properties,
                level,
              );
            }}
            onAdmin1Change={(key, properties, level) => {
              handleLocationChange(
                formState.admin0Key,
                key,
                '' as AdminCodeString,
                properties,
                level,
              );
            }}
            onAdmin2Change={(key, properties, level) => {
              handleLocationChange(
                formState.admin0Key,
                formState.admin1Key,
                key,
                properties,
                level,
              );
            }}
          />
          <FormControl variant="outlined" sx={chartBlockFormControlSx}>
            <InputLabel>{t('Chart Height')}</InputLabel>
            <Select
              value={chartHeightOption}
              onChange={e =>
                handleChartHeightChange(e.target.value as ChartHeight)
              }
              label={t('Chart Height')}
            >
              <MenuItem value={ChartHeight.TALL}>{t('Tall')}</MenuItem>
              <MenuItem value={ChartHeight.MEDIUM}>{t('Medium')}</MenuItem>
              <MenuItem value={ChartHeight.SHORT}>{t('Short')}</MenuItem>
            </Select>
          </FormControl>
          {hasFormChanged && formState.chartLayerId && (
            <Box sx={chartBlockRerunRowSx}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => refetch().catch(console.error)}
                disabled={isLoading}
                sx={chartBlockRerunButtonSx}
              >
                {t('Rerun Chart')}
              </Button>
            </Box>
          )}
        </Box>

        {/* Small preview section */}
        {formState.chartLayerId && (
          <Box sx={chartBlockPreviewSectionSx}>{renderEditPreviewChart()}</Box>
        )}
      </Box>
    </Box>
  );
}

export default ChartBlock;
