import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  makeStyles,
  Typography,
  CircularProgress,
  Button,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import {
  DashboardTableConfig,
  AggregationOperations,
  GeometryType,
  aggregationOperationsToDisplay,
  DashboardMode,
} from 'config/types';
import { useAnalysisForm, useAnalysisExecution } from 'utils/analysis-hooks';
import { useDispatch, useSelector } from 'react-redux';
import {
  setIsMapLayerActive,
  isAnalysisLayerActiveSelector,
} from 'context/analysisResultStateSlice';
import {
  useAnalysisTableColumns,
  downloadCSVFromTableData,
  BaselineLayerResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
import SimpleAnalysisTable from 'components/MapView/LeftPanel/AnalysisPanel/SimpleAnalysisTable';
import {
  HazardLayerSelector,
  BaselineLayerSelector,
  StatisticSelector,
  ThresholdInputs,
  DateSelector,
  DateRangeSelector,
  AdminLevelSelector,
} from 'components/Common/AnalysisFormComponents';
import { useSafeTranslation } from 'i18n';
import { dashboardModeSelector } from '../../context/dashboardStateSlice';
import BlockPreviewHeader from './BlockPreviewHeader';

interface TableBlockProps extends Partial<DashboardTableConfig> {
  index: number;
  allowDownload?: boolean;
}

function TableBlock({
  index,
  startDate: initialStartDate,
  hazardLayerId: initialHazardLayerId,
  baselineLayerId: initialBaselineLayerId,
  threshold: initialThreshold,
  stat: initialStat,
  allowDownload,
}: TableBlockProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const mode = useSelector(dashboardModeSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const formState = useAnalysisForm({
    initialHazardLayerId,
    initialBaselineLayerId,
    initialStartDate,
    initialThreshold,
    initialStat,
  });

  const { runAnalyser } = useAnalysisExecution(formState, {
    // TableBlock doesn't need URL history updates
    onUrlUpdate: undefined,
    clearOnUnmount: true,
  });

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | number>('name');
  const [isAscending, setIsAscending] = useState(true);

  // Form updates state
  const [hasFormChanged, setHasFormChanged] = useState(false);
  const [wasAnalysisLoading, setWasAnalysisLoading] = useState(false);

  const handleSort = (columnId: string | number) => {
    if (sortColumn === columnId) {
      setIsAscending(!isAscending);
    } else {
      setSortColumn(columnId);
      setIsAscending(true);
    }
  };

  const handleToggleLayerVisibility = () => {
    dispatch(setIsMapLayerActive(!isAnalysisLayerActive));
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

  // Track form changes that would require rerunning analysis
  useEffect(() => {
    // Don't mark as changed on initial mount
    if (!formState.hazardLayerId) {
      return;
    }

    // Mark form as changed whenever analysis-relevant fields change
    setHasFormChanged(true);
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
      }
    }
  }, [
    formState.isAnalysisLoading,
    wasAnalysisLoading,
    formState.analysisResult,
  ]);

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

    if (canRunAnalysis && !formState.analysisResult) {
      runAnalyser().catch(console.error);
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
    runAnalyser,
  ]);

  // Get analysis columns and table data
  const { translatedColumns } = useAnalysisTableColumns(
    formState.analysisResult || undefined,
  );
  const analysisTableData = useMemo(
    () => formState.analysisResult?.tableData || [],
    [formState.analysisResult],
  );

  const renderPreviewTable = () => {
    if (formState.isAnalysisLoading) {
      return (
        <Box className={classes.loadingContainer}>
          <CircularProgress size={40} />
          <Typography variant="body2" style={{ marginTop: 16 }}>
            {t('Loading analysis data...')}
          </Typography>
        </Box>
      );
    }

    if (!formState.analysisResult || !analysisTableData.length) {
      return (
        <Typography variant="body2" color="textSecondary">
          {formState.hazardLayerId
            ? t('Configure analysis parameters to see data')
            : t('Select a hazard layer to start')}
        </Typography>
      );
    }

    return (
      <SimpleAnalysisTable
        tableData={analysisTableData}
        columns={translatedColumns}
        sortColumn={sortColumn}
        isAscending={isAscending}
        onSort={handleSort}
        maxRows={mode === DashboardMode.PREVIEW ? 16 : 8}
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

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (mode === DashboardMode.PREVIEW) {
    return (
      <Box className={classes.previewContainer}>
        {formState.selectedHazardLayer ? (
          <>
            <BlockPreviewHeader
              title={generatePreviewTitle()}
              subtitle={formatPreviewDate()}
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
            {renderPreviewTable()}
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
    <Box className={classes.grayCard}>
      <Typography variant="h3" className={classes.blockTitle}>
        {t('Table Block')} #{index + 1}
      </Typography>

      {formState.analysisResult && (
        <Box className={classes.toggleContainer}>
          <FormControlLabel
            control={
              <Switch
                checked={isAnalysisLayerActive}
                onChange={handleToggleLayerVisibility}
                color="primary"
              />
            }
            label={t('Show on map')}
          />
        </Box>
      )}

      <Box className={classes.formContainer}>
        <Box className={classes.formSection}>
          <HazardLayerSelector
            value={formState.hazardLayerId}
            onChange={formState.setHazardLayerId}
          />
        </Box>

        {formState.hazardDataType === GeometryType.Polygon ? (
          <Box className={classes.formSection}>
            <DateRangeSelector
              startDate={formState.startDate}
              endDate={formState.endDate}
              onStartDateChange={formState.setStartDate}
              onEndDateChange={formState.setEndDate}
              availableDates={formState.availableHazardDates}
            />
            <Box className={classes.dateAnalysisRow}>
              <AdminLevelSelector
                value={formState.adminLevel}
                onChange={formState.setAdminLevel}
              />
              {hasFormChanged && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => runAnalyser().catch(console.error)}
                  disabled={formState.isAnalysisLoading}
                  className={classes.rerunButton}
                >
                  {t('Rerun Analysis')}
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Box className={classes.formSection}>
            <BaselineLayerSelector
              value={formState.baselineLayerId}
              onChange={formState.setBaselineLayerId}
            />

            <Box className={classes.statisticThresholdRow}>
              <StatisticSelector
                value={formState.statistic}
                onChange={formState.setStatistic}
                exposureValue={formState.exposureValue}
                onExposureValueChange={formState.setExposureValue}
                selectedHazardLayer={formState.selectedHazardLayer}
              />

              <ThresholdInputs
                belowThreshold={formState.belowThreshold}
                aboveThreshold={formState.aboveThreshold}
                onBelowThresholdChange={formState.setBelowThreshold}
                onAboveThresholdChange={formState.setAboveThreshold}
                statistic={formState.statistic}
                requiredThresholdNotSet={formState.requiredThresholdNotSet}
              />
            </Box>

            <Box className={classes.dateAnalysisRow}>
              <DateSelector
                selectedDate={formState.selectedDate}
                onDateChange={formState.setSelectedDate}
                availableDates={formState.availableHazardDates}
              />
              {hasFormChanged && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => runAnalyser().catch(console.error)}
                  disabled={formState.isAnalysisLoading}
                  className={classes.rerunButton}
                >
                  {t('Rerun Analysis')}
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Preview section */}
        {formState.hazardLayerId && (
          <Box className={classes.previewSection}>{renderPreviewTable()}</Box>
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
    minHeight: 200,
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
  statisticThresholdRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(2),
    alignItems: 'flex-start',
    '& > *': {
      flex: 1,
    },
  },
  dateAnalysisRow: {
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
  previewSection: {},
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  tableTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  toggleContainer: {
    padding: theme.spacing(1),
    display: 'flex',
  },
}));

export default TableBlock;
