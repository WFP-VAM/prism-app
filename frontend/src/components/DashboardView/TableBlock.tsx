import GetAppIcon from '@mui/icons-material/GetApp';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AdminLevelSelector,
  BaselineLayerSelector,
  DateRangeSelector,
  DateSelector,
  HazardLayerSelector,
  StatisticSelector,
  ThresholdInputs,
} from 'components/Common/AnalysisFormComponents';
import AnalysisTable from 'components/MapView/LeftPanel/AnalysisPanel/AnalysisTable';
import {
  AggregationOperations,
  aggregationOperationsToDisplay,
  DashboardMode,
  DashboardTableConfig,
  GeometryType,
  LayerKey,
} from 'config/types';
import {
  analysisResultErrorSelector,
  setIsMapLayerActive,
} from 'context/analysisResultStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { useSafeTranslation } from 'i18n';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAnalysisExecution, useAnalysisForm } from 'utils/analysis-hooks';
import {
  BaselineLayerResult,
  downloadCSVFromTableData,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from 'utils/analysis-utils';
import { formatCoverageRange, getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { getCoverageForLayerAndDate } from 'utils/server-utils';

import {
  dashboardModeSelector,
  dashboardTableStateSelector,
  selectedDashboardIndexSelector,
  updateBlockConfig,
  updateTableState,
} from '../../context/dashboardStateSlice';
import BlockPreviewHeader from './BlockPreviewHeader';
import {
  tableBlockDateAnalysisRowSx,
  tableBlockDateColumnSx,
  tableBlockFormContainerSx,
  tableBlockFormSectionSx,
  tableBlockGrayCardSx,
  tableBlockLoadingContainerSx,
  tableBlockMaxRowsInputSx,
  tableBlockPreviewContainerSx,
  tableBlockPreviewHeaderWrapperSx,
  tableBlockPreviewTableWrapperSx,
  tableBlockRerunButtonSx,
  tableBlockStatisticThresholdRowSx,
  tableBlockTitleSx,
} from './tableBlockStyles';

interface TableBlockProps extends Partial<DashboardTableConfig> {
  index: number;
  columnIndex: number;
  elementIndex: number;
  allowDownload?: boolean;
  maxRows?: number;
  headerSlot?: ReactNode;
}

function TableBlock({
  index,
  columnIndex,
  elementIndex,
  startDate: initialStartDate,
  hazardLayerId: initialHazardLayerId,
  baselineLayerId: initialBaselineLayerId,
  threshold: initialThreshold,
  stat: initialStat,
  maxRows: initialMaxRows,
  useLatestAvailableDate: initialUseLatestAvailableDate,
  allowDownload,
  addResultToMap = true,
  sortColumn: initialSortColumn = 'name',
  sortOrder: _initialSortOrder = 'asc',
  headerSlot,
}: TableBlockProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const mode = useSelector(dashboardModeSelector);
  const selectedDashboardIndex = useSelector(selectedDashboardIndexSelector);
  const analysisError = useSelector(analysisResultErrorSelector);

  const [useLatest, setUseLatest] = useState(
    initialUseLatestAvailableDate ?? false,
  );

  useEffect(() => {
    setUseLatest(initialUseLatestAvailableDate ?? false);
  }, [initialUseLatestAvailableDate, selectedDashboardIndex]);

  // Create element ID for Redux state
  const elementId = `${columnIndex}-${elementIndex}`;

  // Get table state from Redux (or use initial values)
  const tableState = useSelector(dashboardTableStateSelector(elementId));
  const maxRows = tableState?.maxRows ?? initialMaxRows ?? 8;
  const sortColumn = tableState?.sortColumn ?? initialSortColumn ?? 'name';
  const isAscending = tableState?.sortOrder === 'asc';

  const effectiveInitialStartDate = useLatest ? undefined : initialStartDate;

  const formState = useAnalysisForm({
    initialHazardLayerId,
    initialBaselineLayerId,
    initialStartDate: effectiveInitialStartDate,
    initialThreshold,
    initialStat,
  });

  const { runAnalyser } = useAnalysisExecution(formState, {
    // TableBlock doesn't need URL history updates
    onUrlUpdate: undefined,
    clearOnUnmount: true,
  });

  // Form updates state
  const [hasFormChanged, setHasFormChanged] = useState(false);
  const [wasAnalysisLoading, setWasAnalysisLoading] = useState(false);

  // Retry tracking state
  const MAX_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);
  const [hasInitiatedAnalysis, setHasInitiatedAnalysis] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSort = (columnId: string | number) => {
    if (sortColumn === columnId) {
      dispatch(
        updateTableState({
          elementId,
          updates: { sortOrder: isAscending ? 'desc' : 'asc' },
        }),
      );
    } else {
      dispatch(
        updateTableState({
          elementId,
          updates: { sortColumn: columnId, sortOrder: 'asc' },
        }),
      );
    }
  };

  const handleSetMaxRows = (newMaxRows: number) => {
    dispatch(
      updateTableState({
        elementId,
        updates: { maxRows: newMaxRows },
      }),
    );
  };

  const persistBlockConfig = (updates: Partial<DashboardTableConfig>) => {
    dispatch(
      updateBlockConfig({
        columnIndex,
        elementIndex,
        updates,
      }),
    );
  };

  const handleHazardLayerChange = (id: LayerKey | undefined) => {
    formState.setHazardLayerId(id);
    persistBlockConfig({ hazardLayerId: id ?? '' });
  };

  const handleBaselineLayerChange = (id: LayerKey | undefined) => {
    formState.setBaselineLayerId(id);
    persistBlockConfig({ baselineLayerId: id ?? '' });
  };

  const handleStatisticChange = (newStat: AggregationOperations) => {
    formState.setStatistic(newStat);
    persistBlockConfig({ stat: newStat });
  };

  const handleStartDateChange = (date: number | null) => {
    formState.setStartDate(date);
    persistBlockConfig({
      startDate: date ? new Date(date).toISOString() : undefined,
    });
  };

  const handleSelectedDateChange = (date: number | null) => {
    formState.setSelectedDate(date);
    persistBlockConfig({
      startDate: date ? new Date(date).toISOString() : undefined,
    });
  };

  const persistThreshold = (below: string, above: string) => {
    persistBlockConfig({
      threshold: {
        below: below ? parseFloat(below) : undefined,
        above: above ? parseFloat(above) : undefined,
      },
    });
  };

  const handleBelowThresholdChange = (value: string) => {
    formState.setBelowThreshold(value);
    persistThreshold(value, formState.aboveThreshold);
  };

  const handleAboveThresholdChange = (value: string) => {
    formState.setAboveThreshold(value);
    persistThreshold(formState.belowThreshold, value);
  };

  const handleDownloadCSV = () => {
    if (
      formState.analysisResult &&
      (formState.analysisResult instanceof BaselineLayerResult ||
        formState.analysisResult instanceof PolygonAnalysisResult)
    ) {
      downloadCSVFromTableData(
        formState.analysisResult,
        translatedColumns,
        formState.selectedDate,
        sortColumn,
        isAscending ? 'asc' : 'desc',
      );
    }
  };

  const handleManualRetry = () => {
    setRetryCount(0);
    runAnalyser();
  };

  // Track form changes that would require rerunning analysis
  useEffect(() => {
    // Don't mark as changed on initial mount
    if (!formState.hazardLayerId) {
      return;
    }

    // Mark form as changed whenever analysis-relevant fields change
    setHasFormChanged(true);
    setRetryCount(0);
  }, [
    formState.hazardLayerId,
    formState.startDate,
    formState.endDate,
    formState.selectedDate,
    formState.adminLevel,
    formState.baselineLayerId,
    formState.statistic,
    formState.belowThreshold,
    formState.aboveThreshold,
    formState.exposureValue.operator,
    formState.exposureValue.value,
  ]);

  // Reset form changed flag when analysis completes (loading goes from true to false)
  useEffect(() => {
    // Update loading state tracker
    if (formState.isAnalysisLoading !== wasAnalysisLoading) {
      setWasAnalysisLoading(formState.isAnalysisLoading);

      // If loading just finished (was true, now false), reset the changed flag
      if (
        wasAnalysisLoading &&
        !formState.isAnalysisLoading &&
        formState.analysisResult
      ) {
        setHasFormChanged(false);
        setRetryCount(0);
      }
    }
  }, [
    formState.isAnalysisLoading,
    wasAnalysisLoading,
    formState.analysisResult,
  ]);

  // Keep map layer visibility in sync with saved table config
  useEffect(() => {
    dispatch(setIsMapLayerActive(addResultToMap));
  }, [addResultToMap, dispatch]);

  // Track analysis failures and handle retries
  useEffect(() => {
    if (analysisError && hasInitiatedAnalysis && retryCount < MAX_RETRIES) {
      setRetryCount(retryCount + 1);
      retryTimeoutRef.current = setTimeout(() => {
        runAnalyser();
      }, 500);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [analysisError, hasInitiatedAnalysis, retryCount, runAnalyser]);

  // Auto-run analysis when conditions are met (for both edit and preview modes)
  useEffect(() => {
    if (!formState.hazardLayerId) {
      return;
    }

    const canRunAnalysis = Boolean(
      !formState.isAnalysisLoading &&
      !formState.requiredThresholdNotSet &&
      formState.hazardLayerId &&
      (formState.hazardDataType === GeometryType.Polygon
        ? formState.startDate && formState.adminLevelLayerData
        : formState.selectedDate && formState.baselineLayerId) &&
      !(
        formState.statistic === AggregationOperations['Area exposed'] &&
        (!formState.exposureValue.operator || !formState.exposureValue.value)
      ),
    );

    if (
      canRunAnalysis &&
      !formState.analysisResult &&
      retryCount < MAX_RETRIES
    ) {
      setHasInitiatedAnalysis(true);
      runAnalyser();
    }
  }, [
    formState.hazardLayerId,
    formState.isAnalysisLoading,
    formState.requiredThresholdNotSet,
    formState.hazardDataType,
    formState.startDate,
    formState.endDate,
    formState.adminLevelLayerData,
    formState.selectedDate,
    formState.baselineLayerId,
    formState.statistic,
    formState.exposureValue.operator,
    formState.exposureValue.value,
    formState.analysisResult,
    retryCount,
    runAnalyser,
  ]);

  // Get analysis columns and table data
  const { translatedColumns } = useAnalysisTableColumns(
    formState.analysisResult || undefined,
  );

  const analysisTableData = useMemo(() => {
    const rawData = formState.analysisResult?.tableData || [];
    if (!sortColumn || rawData.length === 0) {
      return rawData;
    }

    const sortedData = [...rawData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) {
        return isAscending ? -1 : 1;
      }
      if (aValue > bValue) {
        return isAscending ? 1 : -1;
      }
      return 0;
    });

    return sortedData;
  }, [formState.analysisResult, sortColumn, isAscending]);

  const renderPreviewTable = () => {
    if (
      (!hasInitiatedAnalysis &&
        !formState.isAnalysisLoading &&
        !formState.analysisResult) ||
      formState.isAnalysisLoading
    ) {
      const message =
        !hasInitiatedAnalysis &&
        !formState.isAnalysisLoading &&
        !formState.analysisResult
          ? t('Preparing to load analysis...')
          : t('Loading analysis data...');
      return (
        <Box sx={tableBlockLoadingContainerSx}>
          <CircularProgress size={40} />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            {message}
          </Typography>
        </Box>
      );
    }

    if (
      retryCount >= MAX_RETRIES &&
      !formState.isAnalysisLoading &&
      !formState.analysisResult &&
      hasInitiatedAnalysis
    ) {
      return (
        <Box sx={tableBlockLoadingContainerSx}>
          <Typography
            variant="body2"
            color="error"
            style={{ marginBottom: 16 }}
          >
            {t('Failed to load results')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleManualRetry}
          >
            {t('Retry Analysis')}
          </Button>
        </Box>
      );
    }

    // Empty/Configure state
    if (!formState.analysisResult || !analysisTableData.length) {
      return (
        <Typography variant="body2" color="textSecondary">
          {formState.hazardLayerId
            ? t('Configure analysis parameters to see data')
            : t('Select a hazard layer to start')}
        </Typography>
      );
    }

    // Success state - show table
    return (
      <AnalysisTable
        tableData={analysisTableData}
        columns={translatedColumns}
        sortColumn={sortColumn}
        isAscending={isAscending}
        handleChangeOrderBy={handleSort}
        disableHighZIndex
        maxRows={maxRows}
        compact
      />
    );
  };

  const generatePreviewTitle = () => {
    if (!formState.selectedHazardLayer) {
      return '';
    }

    const layerTitle = t(formState.selectedHazardLayer.title) || t('Analysis');
    const statisticName = formState.statistic
      ? aggregationOperationsToDisplay[formState.statistic] ||
        t(formState.statistic)
      : '';

    return statisticName ? `${layerTitle} (${statisticName})` : layerTitle;
  };

  const formatPreviewDate = () => {
    const date = formState.selectedDate || formState.startDate;
    if (!date) {
      return '';
    }

    // Use a locale-aware format so the month name follows the selected language.
    return (
      getFormattedDate(
        date,
        DateFormat.DayFirstHyphenMonthName,
        t('date_locale'),
      ) || ''
    );
  };

  // Coverage period configured on the hazard layer, shown instead of the plain
  // date to give the proper context of the analysis. Derived from the layer
  // config + selected date so it shows even before/without an analysis result.
  const serverAvailableDates = useSelector(availableDatesSelector);
  const coverageText = useMemo(() => {
    if (!formState.selectedHazardLayer) {
      return '';
    }
    const date = formState.selectedDate || formState.startDate;
    const coverage = getCoverageForLayerAndDate(
      formState.selectedHazardLayer,
      serverAvailableDates,
      date,
    );
    return (
      formatCoverageRange(
        coverage.startDate,
        coverage.endDate,
        DateFormat.DayFirstHyphenMonthName,
        t('date_locale'),
      ) || ''
    );
  }, [
    formState.selectedHazardLayer,
    formState.selectedDate,
    formState.startDate,
    serverAvailableDates,
    t,
  ]);

  // Prefer the configured coverage period over the plain selected date.
  // Depends on `t` so the subtitle re-renders (and re-localizes) on language switch.
  const previewSubtitle = useMemo(
    () => coverageText || formatPreviewDate(),
    [coverageText, formState.selectedDate, formState.startDate, t],
  );

  if (mode === DashboardMode.VIEW) {
    return (
      <Box sx={tableBlockPreviewContainerSx}>
        {formState.selectedHazardLayer ? (
          <>
            <Box sx={tableBlockPreviewHeaderWrapperSx}>
              <BlockPreviewHeader
                title={generatePreviewTitle()}
                subtitle={previewSubtitle}
                downloadActions={
                  allowDownload &&
                  formState.analysisResult &&
                  analysisTableData.length > 0 && (
                    <Tooltip title={t('Download CSV') as string}>
                      <IconButton onClick={handleDownloadCSV} size="small">
                        <GetAppIcon />
                      </IconButton>
                    </Tooltip>
                  )
                }
              />
            </Box>
            <Box sx={tableBlockPreviewTableWrapperSx}>
              {renderPreviewTable()}
            </Box>
          </>
        ) : (
          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <Typography variant="body1" color="textSecondary" align="center">
              {t('No analysis configured')}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={tableBlockGrayCardSx}>
      {headerSlot ?? (
        <Typography variant="h3" sx={tableBlockTitleSx}>
          {t('Table Block')} #{index + 1}
        </Typography>
      )}

      <Box sx={tableBlockFormContainerSx}>
        <Box sx={tableBlockFormSectionSx}>
          <HazardLayerSelector
            value={formState.hazardLayerId}
            onChange={handleHazardLayerChange}
          />
        </Box>

        {formState.hazardDataType === GeometryType.Polygon ? (
          <Box sx={tableBlockFormSectionSx}>
            {!useLatest && (
              <DateRangeSelector
                startDate={formState.startDate}
                endDate={formState.endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={formState.setEndDate}
                availableDates={formState.availableHazardDates}
              />
            )}
            <Box sx={tableBlockDateAnalysisRowSx}>
              <AdminLevelSelector
                value={formState.adminLevel}
                onChange={formState.setAdminLevel}
              />
              {hasFormChanged && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => runAnalyser()}
                  disabled={formState.isAnalysisLoading}
                  sx={tableBlockRerunButtonSx}
                >
                  {t('Rerun Analysis')}
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={tableBlockFormSectionSx}>
            <BaselineLayerSelector
              value={formState.baselineLayerId}
              onChange={handleBaselineLayerChange}
            />

            <Box sx={tableBlockStatisticThresholdRowSx}>
              <StatisticSelector
                value={formState.statistic}
                onChange={handleStatisticChange}
                exposureValue={formState.exposureValue}
                onExposureValueChange={formState.setExposureValue}
                selectedHazardLayer={formState.selectedHazardLayer}
              />

              <ThresholdInputs
                belowThreshold={formState.belowThreshold}
                aboveThreshold={formState.aboveThreshold}
                onBelowThresholdChange={handleBelowThresholdChange}
                onAboveThresholdChange={handleAboveThresholdChange}
                statistic={formState.statistic}
                requiredThresholdNotSet={formState.requiredThresholdNotSet}
              />
            </Box>

            <Box sx={tableBlockDateAnalysisRowSx}>
              {!useLatest && (
                <Box sx={tableBlockDateColumnSx}>
                  <DateSelector
                    selectedDate={formState.selectedDate}
                    onDateChange={handleSelectedDateChange}
                    availableDates={formState.availableHazardDates}
                  />
                </Box>
              )}
              <TextField
                label={t('Max rows')}
                type="number"
                value={maxRows}
                onChange={e =>
                  handleSetMaxRows(
                    Math.max(1, parseInt(e.target.value, 10) || 1),
                  )
                }
                slotProps={{ htmlInput: { min: 1, max: 25 } }}
                sx={tableBlockMaxRowsInputSx}
                size="small"
                variant="outlined"
              />
              {hasFormChanged && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => runAnalyser()}
                  disabled={formState.isAnalysisLoading}
                  sx={tableBlockRerunButtonSx}
                >
                  {t('Rerun Analysis')}
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Preview section */}
        {formState.hazardLayerId && <Box>{renderPreviewTable()}</Box>}
      </Box>
    </Box>
  );
}

export default TableBlock;
