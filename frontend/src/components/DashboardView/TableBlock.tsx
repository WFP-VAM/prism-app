import { useEffect, useMemo } from 'react';
import {
  Box,
  makeStyles,
  Typography,
  CircularProgress,
} from '@material-ui/core';
import {
  DashboardTableConfig,
  AggregationOperations,
  GeometryType,
} from 'config/types';
import { useAnalysisForm, useAnalysisExecution } from 'utils/analysis-hooks';
import { useAnalysisTableColumns } from 'utils/analysis-utils';
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

type TableBlockMode = 'edit' | 'preview';

interface TableBlockProps extends Partial<DashboardTableConfig> {
  index: number;
  mode?: TableBlockMode;
}

function TableBlock({
  index,
  startDate: initialStartDate,
  hazardLayerId: initialHazardLayerId,
  baselineLayerId: initialBaselineLayerId,
  threshold: initialThreshold,
  stat: initialStat,
  mode = 'edit',
}: TableBlockProps) {
  const classes = useStyles();

  // 🎯 All the complex analysis logic is now just 2 hook calls!
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
  });

  // Auto-run analysis when conditions are met (for preview mode)
  useEffect(() => {
    if (mode !== 'edit' || !formState.hazardLayerId) {
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
    mode,
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
            Loading analysis data...
          </Typography>
        </Box>
      );
    }

    if (!formState.analysisResult || !analysisTableData.length) {
      return (
        <Typography variant="body2" color="textSecondary">
          {formState.hazardLayerId
            ? 'Configure analysis parameters to see data'
            : 'Select a hazard layer to start'}
        </Typography>
      );
    }

    return (
      <Box className={classes.tableContainer}>
        <SimpleAnalysisTable
          tableData={analysisTableData}
          columns={translatedColumns}
          sortColumn="name"
          isAscending
          onSort={() => {}} // No sorting in preview mode
          maxRows={8} // Show fewer rows in dashboard block
        />
      </Box>
    );
  };

  if (mode === 'preview') {
    return (
      <Box className={classes.previewContainer}>
        {formState.selectedHazardLayer ? (
          renderPreviewTable()
        ) : (
          <Typography variant="h6" color="textSecondary">
            No table configured
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box className={classes.grayCard}>
      <Typography variant="h3" className={classes.blockTitle}>
        Block #{index + 1}
      </Typography>

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
            <AdminLevelSelector
              value={formState.adminLevel}
              onChange={formState.setAdminLevel}
            />
          </Box>
        ) : (
          <Box className={classes.formSection}>
            <BaselineLayerSelector
              value={formState.baselineLayerId}
              onChange={formState.setBaselineLayerId}
            />

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

            <DateSelector
              selectedDate={formState.selectedDate}
              onDateChange={formState.setSelectedDate}
              availableDates={formState.availableHazardDates}
            />
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
  previewSection: {},
  previewTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
  },
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
}));

export default TableBlock;
