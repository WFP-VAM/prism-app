import { BarChartOutlined, CloseRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePostHog } from '@posthog/react';
import {
  AdminLevelSelector,
  BaselineLayerSelector,
  DateRangeSelector,
  DateSelector,
  HazardLayerSelector,
  StatisticSelector,
  ThresholdInputs,
} from 'components/Common/AnalysisFormComponents';
import { analysisPanelParamTextSx } from 'components/Common/formComponentStyles';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import {
  AdminLevelDataLayerProps,
  AggregationOperations,
  GeometryType,
  Panel,
  PanelSize,
  RasterType,
} from 'config/types';
import { LayerDefinitions } from 'config/utils';
import {
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
  clearAnalysisResult,
  exposureAnalysisResultSortByKeySelector,
  exposureAnalysisResultSortOrderSelector,
  isExposureAnalysisLoadingSelector,
  setAnalysisResultSortByKey,
  setAnalysisResultSortOrder,
  setExposureAnalysisResultSortByKey,
  setExposureAnalysisResultSortOrder,
  setIsMapLayerActive,
  TableRow,
} from 'context/analysisResultStateSlice';
import { useDispatch, useSelector } from 'context/hooks';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { addLayer, removeLayer } from 'context/mapStateSlice';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { orderBy } from 'lodash';
import { black } from 'muiTheme';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useAnalysisExecution, useAnalysisForm } from 'utils/analysis-hooks';
import {
  BaselineLayerResult,
  Column,
  downloadCSVFromTableData,
  ExposedPopulationResult,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
} from 'utils/analysis-utils';
import { refreshBoundaries, safeDispatchAddLayer } from 'utils/map-utils';
import { useUrlHistory } from 'utils/url-utils';

import { getExposureAnalysisTableData } from '../../utils';
import {
  analysisButtonContainerSx,
  analysisButtonSx,
  analysisPanelParamsSx,
  analysisPanelRootSx,
  analysisPanelSx,
  analysisTableCloseButtonSx,
  analysisTableContainerSx,
  analysisTableTitleSx,
  bottomButtonSx,
  exposureAnalysisLoadingContainerSx,
  exposureAnalysisLoadingTextContainerSx,
  exposureAnalysisLoadingTextSx,
} from '../leftPanelStyles';
import AnalysisTable from './AnalysisTable';
import ExposureAnalysisTable from './AnalysisTable/ExposureAnalysisTable';
import ExposureAnalysisActions from './ExposureAnalysisActions';

const tabPanelType = Panel.Analysis;

const AnalysisPanel = memo(() => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const selectedLayers = useSelector(layersSelector);
  const {
    updateHistory,
    removeKeyFromUrl,
    resetAnalysisParams,
    updateAnalysisParams,
    getAnalysisParams,
  } = useUrlHistory();
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const exposureAnalysisResultSortByKey = useSelector(
    exposureAnalysisResultSortByKeySelector,
  );
  const exposureAnalysisResultSortOrder = useSelector(
    exposureAnalysisResultSortOrderSelector,
  );
  const isExposureAnalysisLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );
  const tabValue = useSelector(leftPanelTabValueSelector);

  const [showTable, setShowTable] = useState(false);
  // defaults the sort column of exposure analysis to 'name'
  const [exposureAnalysisSortColumn, setExposureAnalysisSortColumn] = useState<
    Column['id']
  >(exposureAnalysisResultSortByKey);
  // exposure analysis sort order
  const [exposureAnalysisIsAscending, setExposureAnalysisIsAscending] =
    useState(exposureAnalysisResultSortOrder === 'asc');
  // defaults the sort column of every other analysis table to 'name'
  const [analysisSortColumn, setAnalysisSortColumn] = useState<Column['id']>(
    analysisResultSortByKey,
  );
  // general analysis table sort order
  const [analysisIsAscending, setAnalysisIsAscending] = useState(
    analysisResultSortOrder === 'asc',
  );

  const {
    analysisHazardLayerId: hazardLayerIdFromUrl,
    analysisBaselineLayerId: baselineLayerIdFromUrl,
    analysisStatistic: selectedStatisticFromUrl,
    analysisThresholdAbove: aboveThresholdFromUrl,
    analysisThresholdBelow: belowThresholdFromUrl,
    analysisStartDate: selectedStartDateFromUrl,
  } = getAnalysisParams();

  const formState = useAnalysisForm({
    initialHazardLayerId: hazardLayerIdFromUrl,
    initialBaselineLayerId: baselineLayerIdFromUrl,
    initialStartDate: selectedStartDateFromUrl,
    initialThreshold: {
      above: aboveThresholdFromUrl
        ? parseFloat(aboveThresholdFromUrl)
        : undefined,
      below: belowThresholdFromUrl
        ? parseFloat(belowThresholdFromUrl)
        : undefined,
    },
    initialStat: selectedStatisticFromUrl as AggregationOperations | undefined,
  });

  const {
    // Form state
    hazardLayerId,
    setHazardLayerId,
    baselineLayerId,
    setBaselineLayerId,
    statistic,
    setStatistic,
    selectedDate,
    setSelectedDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    belowThreshold,
    setBelowThreshold,
    aboveThreshold,
    setAboveThreshold,
    exposureValue,
    setExposureValue,
    adminLevel,
    setAdminLevel,
    // Derived values
    selectedHazardLayer,
    hazardDataType,
    adminLevelLayerData,
    requiredThresholdNotSet,
    availableHazardDates,
    // Analysis state
    analysisResult,
    isAnalysisLoading,
  } = formState;

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState(
    preSelectedBaselineLayer?.id,
  );

  const restoreMapAfterAnalysisClear = useCallback(() => {
    resetAnalysisParams();
    refreshBoundaries(map, { addLayer, removeLayer });

    if (previousBaselineId) {
      const previousBaseline = LayerDefinitions[
        previousBaselineId
      ] as AdminLevelDataLayerProps;
      updateHistory(BASELINE_URL_LAYER_KEY, previousBaselineId);
      safeDispatchAddLayer(map, previousBaseline, dispatch);
      dispatch(setIsMapLayerActive(true));
    }
  }, [dispatch, map, previousBaselineId, resetAnalysisParams, updateHistory]);

  const clearAnalysisState = useCallback(
    (options?: { resetFormFromUrl?: boolean }) => {
      const isClearingExposureAnalysis =
        analysisResult instanceof ExposedPopulationResult;
      dispatch(clearAnalysisResult());
      if (isClearingExposureAnalysis) {
        dispatch(setTabValue(Panel.Layers));
      }
      if (options?.resetFormFromUrl) {
        setHazardLayerId(hazardLayerIdFromUrl);
        setStatistic(
          (selectedStatisticFromUrl as AggregationOperations) || statistic,
        );
        setBaselineLayerId(baselineLayerIdFromUrl);
        setBelowThreshold(belowThresholdFromUrl || '');
        setAboveThreshold(aboveThresholdFromUrl || '');
      }
      restoreMapAfterAnalysisClear();
    },
    [
      analysisResult,
      baselineLayerIdFromUrl,
      belowThresholdFromUrl,
      aboveThresholdFromUrl,
      dispatch,
      hazardLayerIdFromUrl,
      restoreMapAfterAnalysisClear,
      selectedStatisticFromUrl,
      setBaselineLayerId,
      setBelowThreshold,
      setAboveThreshold,
      setHazardLayerId,
      setStatistic,
      statistic,
    ],
  );

  const { runAnalyser, hasFormChanged, resetLastExecutedForm } =
    useAnalysisExecution(formState, {
      onUrlUpdate: updateAnalysisParams,
      clearAnalysisFunction: () => clearAnalysisState(),
      // Don't clear on unmount for the main analysis panel - preserve results when navigating away
      clearOnUnmount: false,
    });

  const posthog = usePostHog();
  const { t } = useSafeTranslation();
  const { translatedColumns } = useAnalysisTableColumns(
    analysisResult || undefined,
  );

  // Only expand if analysis results are available.
  useEffect(() => {
    if (!analysisResult) {
      setShowTable(false);
    }
  }, [analysisResult]);

  // The analysis table data
  const analysisTableData = useMemo(
    () =>
      orderBy(
        analysisResult?.tableData,
        analysisSortColumn,
        analysisIsAscending ? 'asc' : 'desc',
      ),
    [analysisResult, analysisSortColumn, analysisIsAscending],
  );

  // handler of general analysis tables sort order
  const handleAnalysisTableOrderBy = useCallback(
    (newAnalysisSortColumn: Column['id']) => {
      const newIsAsc = !(
        analysisSortColumn === newAnalysisSortColumn && analysisIsAscending
      );
      setAnalysisSortColumn(newAnalysisSortColumn);
      setAnalysisIsAscending(newIsAsc);
      // set the sort by key of analysis data in redux
      dispatch(setAnalysisResultSortByKey(newAnalysisSortColumn));
      // set the sort order of analysis result data in redux
      dispatch(setAnalysisResultSortOrder(newIsAsc ? 'asc' : 'desc'));
    },
    [analysisIsAscending, analysisSortColumn, dispatch],
  );

  const clearAnalysis = useCallback(() => {
    resetLastExecutedForm();
    clearAnalysisState({ resetFormFromUrl: true });
  }, [clearAnalysisState, resetLastExecutedForm]);

  const wrappedRunAnalyser = useCallback(async () => {
    if (preSelectedBaselineLayer) {
      setPreviousBaselineId(preSelectedBaselineLayer.id);
      removeKeyFromUrl(BASELINE_URL_LAYER_KEY);
      dispatch(removeLayer(preSelectedBaselineLayer));
    }

    posthog?.capture('analysis_run', {
      hazard_layer_id: hazardLayerId,
      baseline_layer_id: baselineLayerId,
      statistic,
      hazard_data_type: hazardDataType,
    });

    // Only clear the analysis result, don't reset form values
    // This allows users to change parameters and run new analysis without losing their changes
    if (analysisResult) {
      const isClearingExposureAnalysis =
        analysisResult instanceof ExposedPopulationResult;
      dispatch(clearAnalysisResult());
      if (isClearingExposureAnalysis) {
        dispatch(setTabValue(Panel.Layers));
      }
    }

    await runAnalyser();
  }, [
    preSelectedBaselineLayer,
    analysisResult,
    removeKeyFromUrl,
    dispatch,
    runAnalyser,
  ]);

  // handler of changing exposure analysis sort order
  const handleExposureAnalysisTableOrderBy = useCallback(
    (newExposureAnalysisSortColumn: Column['id']) => {
      const newIsAsc = !(
        exposureAnalysisSortColumn === newExposureAnalysisSortColumn &&
        exposureAnalysisIsAscending
      );
      setExposureAnalysisSortColumn(newExposureAnalysisSortColumn);
      setExposureAnalysisIsAscending(newIsAsc);
      // set the sort by key of exposure analysis data in redux
      dispatch(
        setExposureAnalysisResultSortByKey(newExposureAnalysisSortColumn),
      );
      // set the sort order of exposure analysis result data in redux
      dispatch(setExposureAnalysisResultSortOrder(newIsAsc ? 'asc' : 'desc'));
    },
    [dispatch, exposureAnalysisIsAscending, exposureAnalysisSortColumn],
  );

  // The exposure analysis table data
  const exposureAnalysisTableData = getExposureAnalysisTableData(
    (analysisResult?.tableData || []) as TableRow[],
    exposureAnalysisSortColumn,
    exposureAnalysisIsAscending ? 'asc' : 'desc',
  );

  const renderedExposureAnalysisLoading = useMemo(() => {
    if (!isExposureAnalysisLoading) {
      return null;
    }
    return (
      <Box sx={exposureAnalysisLoadingContainerSx}>
        <CircularProgress size={100} />
        <Box sx={exposureAnalysisLoadingTextContainerSx}>
          <Typography
            sx={exposureAnalysisLoadingTextSx}
            variant="body1"
            component="span"
          >
            {t('Loading Exposure Analysis Data')}
          </Typography>
          <LoadingBlinkingDots />
        </Box>
      </Box>
    );
  }, [isExposureAnalysisLoading, t]);

  const renderedExposureAnalysisTable = useMemo(() => {
    if (!(analysisResult instanceof ExposedPopulationResult)) {
      return null;
    }
    return (
      <ExposureAnalysisTable
        tableData={exposureAnalysisTableData}
        columns={translatedColumns}
        sortColumn={exposureAnalysisSortColumn}
        handleChangeOrderBy={handleExposureAnalysisTableOrderBy}
        isAscending={exposureAnalysisIsAscending}
      />
    );
  }, [
    analysisResult,
    exposureAnalysisIsAscending,
    exposureAnalysisSortColumn,
    exposureAnalysisTableData,
    handleExposureAnalysisTableOrderBy,
    translatedColumns,
  ]);

  const renderedPolygonHazardType = useMemo(() => {
    if (hazardDataType !== GeometryType.Polygon) {
      return null;
    }
    return (
      <>
        <AdminLevelSelector value={adminLevel} onChange={setAdminLevel} />

        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          availableDates={availableHazardDates}
        />
      </>
    );
  }, [
    hazardDataType,
    adminLevel,
    setAdminLevel,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    availableHazardDates,
  ]);

  const renderedRasterType = useMemo(() => {
    if (hazardDataType !== RasterType.Raster) {
      return null;
    }
    return (
      <>
        <BaselineLayerSelector
          value={baselineLayerId}
          onChange={setBaselineLayerId}
        />
        <StatisticSelector
          value={statistic}
          onChange={setStatistic}
          exposureValue={exposureValue}
          onExposureValueChange={setExposureValue}
          selectedHazardLayer={selectedHazardLayer}
        />
        <ThresholdInputs
          belowThreshold={belowThreshold}
          aboveThreshold={aboveThreshold}
          onBelowThresholdChange={setBelowThreshold}
          onAboveThresholdChange={setAboveThreshold}
          statistic={statistic}
          requiredThresholdNotSet={requiredThresholdNotSet}
        />
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          availableDates={availableHazardDates}
        />
      </>
    );
  }, [
    hazardDataType,
    baselineLayerId,
    setBaselineLayerId,
    statistic,
    setStatistic,
    exposureValue,
    setExposureValue,
    selectedHazardLayer,
    belowThreshold,
    aboveThreshold,
    setBelowThreshold,
    setAboveThreshold,
    requiredThresholdNotSet,
    selectedDate,
    setSelectedDate,
    availableHazardDates,
  ]);

  const renderedAnalysisPanelInfo = useMemo(() => {
    if (
      isExposureAnalysisLoading ||
      analysisResult instanceof ExposedPopulationResult
    ) {
      return null;
    }
    return (
      <Box id="analysis-parameters" sx={analysisPanelParamsSx}>
        <Box sx={analysisPanelParamTextSx}>
          <HazardLayerSelector
            value={hazardLayerId}
            onChange={setHazardLayerId}
          />
        </Box>
        {renderedPolygonHazardType}
        {renderedRasterType}
      </Box>
    );
  }, [
    analysisResult,
    hazardLayerId,
    setHazardLayerId,
    isExposureAnalysisLoading,
    renderedPolygonHazardType,
    renderedRasterType,
  ]);

  const renderedAnalysisActions = useMemo(() => {
    if (
      isAnalysisLoading ||
      !analysisResult ||
      analysisResult instanceof ExposedPopulationResult
    ) {
      return null;
    }
    return (
      <Box
        sx={analysisButtonContainerSx(theme)}
        style={{
          width: PanelSize.medium,
        }}
      >
        <Button
          sx={analysisButtonSx}
          disabled={!analysisResult}
          onClick={() => {
            posthog?.capture('analysis_table_toggled', {
              visible: !showTable,
            });
            setShowTable(!showTable);
          }}
        >
          <Typography variant="body2">
            {showTable ? t('Hide Table') : t('View Table')}
          </Typography>
        </Button>
        <Button sx={analysisButtonSx} onClick={clearAnalysis}>
          <Typography variant="body2">{t('Clear Analysis')}</Typography>
        </Button>
        <Button
          sx={bottomButtonSx}
          onClick={() => {
            if (
              analysisResult &&
              (analysisResult instanceof BaselineLayerResult ||
                analysisResult instanceof PolygonAnalysisResult)
            ) {
              posthog?.capture('analysis_csv_downloaded', {
                hazard_layer_id: hazardLayerId,
                date: selectedDate,
              });
              downloadCSVFromTableData(
                analysisResult,
                translatedColumns,
                selectedDate,
                analysisSortColumn,
                analysisIsAscending ? 'asc' : 'desc',
              );
            }
          }}
        >
          <Typography variant="body2">{t('Download CSV')}</Typography>
        </Button>
      </Box>
    );
  }, [
    analysisIsAscending,
    analysisResult,
    isAnalysisLoading,
    analysisSortColumn,
    clearAnalysis,
    selectedDate,
    showTable,
    t,
    theme,
    translatedColumns,
  ]);

  const renderedRunAnalysisButton = useMemo(() => {
    // Hide button only for exposure analysis (which has its own action buttons)
    if (analysisResult instanceof ExposedPopulationResult) {
      return null;
    }
    return (
      <Box sx={analysisButtonContainerSx(theme)}>
        {isAnalysisLoading ? <LinearProgress /> : null}
        <Button
          sx={bottomButtonSx}
          onClick={wrappedRunAnalyser}
          startIcon={<BarChartOutlined style={{ color: black }} />}
          disabled={
            isAnalysisLoading ||
            !hasFormChanged ||
            requiredThresholdNotSet ||
            !hazardLayerId ||
            (hazardDataType === GeometryType.Polygon
              ? !startDate || !endDate || !adminLevelLayerData
              : !selectedDate || !baselineLayerId) ||
            (statistic === AggregationOperations['Area exposed'] &&
              (!exposureValue.operator || !exposureValue.value))
          }
        >
          <Typography variant="body2">{t('Run Analysis')}</Typography>
        </Button>
      </Box>
    );
  }, [
    analysisResult,
    isAnalysisLoading,
    hasFormChanged,
    requiredThresholdNotSet,
    hazardLayerId,
    hazardDataType,
    startDate,
    endDate,
    adminLevelLayerData,
    selectedDate,
    baselineLayerId,
    statistic,
    exposureValue.operator,
    exposureValue.value,
    wrappedRunAnalyser,
    t,
    theme,
  ]);

  const renderedExposureAnalysisActions = useMemo(() => {
    if (
      isAnalysisLoading ||
      !analysisResult ||
      !(analysisResult instanceof ExposedPopulationResult)
    ) {
      return null;
    }
    return (
      <Box sx={analysisButtonContainerSx(theme)}>
        <ExposureAnalysisActions
          key={`${exposureAnalysisSortColumn} - ${exposureAnalysisIsAscending}`}
          analysisButtonSx={analysisButtonSx}
          bottomButtonSx={bottomButtonSx}
          clearAnalysis={clearAnalysis}
          tableData={exposureAnalysisTableData}
          columns={translatedColumns}
        />
      </Box>
    );
  }, [
    analysisResult,
    isAnalysisLoading,
    clearAnalysis,
    exposureAnalysisIsAscending,
    exposureAnalysisSortColumn,
    exposureAnalysisTableData,
    theme,
    translatedColumns,
  ]);

  return useMemo(() => {
    if (tabPanelType !== tabValue) {
      return null;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
        <Box sx={analysisPanelRootSx}>
          <Box sx={analysisPanelSx}>
            {renderedExposureAnalysisLoading}
            {renderedExposureAnalysisTable}
            {renderedAnalysisPanelInfo}
            {renderedAnalysisActions}
            {renderedRunAnalysisButton}
          </Box>
          {renderedExposureAnalysisActions}
        </Box>
        {showTable &&
          !isAnalysisLoading &&
          analysisResult &&
          (analysisResult instanceof BaselineLayerResult ||
            analysisResult instanceof PolygonAnalysisResult) && (
            <Box sx={analysisTableContainerSx}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <IconButton
                  aria-label="close"
                  onClick={() => setShowTable(false)}
                  sx={analysisTableCloseButtonSx(theme)}
                  size="large"
                >
                  <CloseRounded />
                </IconButton>
                <Typography sx={analysisTableTitleSx}>
                  {t(selectedHazardLayer?.title as any)}
                </Typography>
              </div>
              <AnalysisTable
                tableData={analysisTableData}
                columns={translatedColumns}
                sortColumn={analysisSortColumn}
                handleChangeOrderBy={handleAnalysisTableOrderBy}
                isAscending={analysisIsAscending}
              />
            </Box>
          )}
      </div>
    );
  }, [
    analysisIsAscending,
    analysisResult,
    isAnalysisLoading,
    selectedHazardLayer,
    analysisSortColumn,
    analysisTableData,
    handleAnalysisTableOrderBy,
    renderedAnalysisActions,
    renderedAnalysisPanelInfo,
    renderedExposureAnalysisActions,
    renderedExposureAnalysisLoading,
    renderedExposureAnalysisTable,
    renderedRunAnalysisButton,
    showTable,
    t,
    tabValue,
    theme,
    translatedColumns,
  ]);
});

export default AnalysisPanel;
