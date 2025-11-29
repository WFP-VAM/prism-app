import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import {
  Button,
  LinearProgress,
  Typography,
  IconButton,
  Theme,
  CircularProgress,
  Box,
} from '@mui/material';
import { BarChartOutlined, CloseRounded } from '@mui/icons-material';
import { useDispatch, useSelector } from 'context/hooks';
import { orderBy } from 'lodash';
import { mapSelector, layersSelector } from 'context/mapStateSlice/selectors';
import { useUrlHistory } from 'utils/url-utils';
import {
  clearAnalysisResult,
  setIsMapLayerActive,
  isExposureAnalysisLoadingSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
  setAnalysisResultSortByKey,
  setAnalysisResultSortOrder,
  exposureAnalysisResultSortByKeySelector,
  exposureAnalysisResultSortOrderSelector,
  setExposureAnalysisResultSortByKey,
  setExposureAnalysisResultSortOrder,
  TableRow,
} from 'context/analysisResultStateSlice';
import {
  AdminLevelDataLayerProps,
  AggregationOperations,
  GeometryType,
  PanelSize,
  Panel,
  RasterType,
} from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { useSafeTranslation } from 'i18n';
import {
  downloadCSVFromTableData,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
  Column,
} from 'utils/analysis-utils';
import { refreshBoundaries, safeDispatchAddLayer } from 'utils/map-utils';
import { addLayer, removeLayer } from 'context/mapStateSlice';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import {
  HazardLayerSelector,
  BaselineLayerSelector,
  StatisticSelector,
  ThresholdInputs,
  DateSelector,
  DateRangeSelector,
  AdminLevelSelector,
} from 'components/Common/AnalysisFormComponents';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import { black, cyanBlue } from 'muiTheme';
import { useAnalysisForm, useAnalysisExecution } from 'utils/analysis-hooks';
import AnalysisTable from './AnalysisTable';
import ExposureAnalysisTable from './AnalysisTable/ExposureAnalysisTable';
import ExposureAnalysisActions from './ExposureAnalysisActions';
import { getExposureAnalysisTableData } from '../../utils';

const tabPanelType = Panel.Analysis;

const AnalysisPanel = memo(() => {
  const classes = useStyles();
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

  const { runAnalyser, hasFormChanged } = useAnalysisExecution(formState, {
    onUrlUpdate: updateAnalysisParams,
    clearAnalysisFunction: () => {
      const isClearingExposureAnalysis =
        analysisResult instanceof ExposedPopulationResult;
      dispatch(clearAnalysisResult());
      if (isClearingExposureAnalysis) {
        dispatch(setTabValue(Panel.Layers));
      }
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
    },
    // Don't clear on unmount for the main analysis panel - preserve results when navigating away
    clearOnUnmount: false,
  });

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState(
    preSelectedBaselineLayer?.id,
  );

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
    const isClearingExposureAnalysis =
      analysisResult instanceof ExposedPopulationResult;
    dispatch(clearAnalysisResult());
    if (isClearingExposureAnalysis) {
      dispatch(setTabValue(Panel.Layers));
    }
    setHazardLayerId(hazardLayerIdFromUrl);
    setStatistic(
      (selectedStatisticFromUrl as AggregationOperations) || statistic,
    );
    setBaselineLayerId(baselineLayerIdFromUrl);
    setBelowThreshold(belowThresholdFromUrl || '');
    setAboveThreshold(aboveThresholdFromUrl || '');

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
  }, [
    analysisResult,
    setHazardLayerId,
    hazardLayerIdFromUrl,
    setStatistic,
    selectedStatisticFromUrl,
    statistic,
    setBaselineLayerId,
    baselineLayerIdFromUrl,
    setBelowThreshold,
    belowThresholdFromUrl,
    setAboveThreshold,
    aboveThresholdFromUrl,
    dispatch,
    resetAnalysisParams,
    map,
    previousBaselineId,
    updateHistory,
  ]);

  const wrappedRunAnalyser = useCallback(async () => {
    if (preSelectedBaselineLayer) {
      setPreviousBaselineId(preSelectedBaselineLayer.id);
      removeKeyFromUrl(BASELINE_URL_LAYER_KEY);
      dispatch(removeLayer(preSelectedBaselineLayer));
    }

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
      <Box className={classes.exposureAnalysisLoadingContainer}>
        <CircularProgress size={100} />
        <Box className={classes.exposureAnalysisLoadingTextContainer}>
          <Typography
            className={classes.exposureAnalysisLoadingText}
            variant="body1"
            component="span"
          >
            {t('Loading Exposure Analysis Data')}
          </Typography>
          <LoadingBlinkingDots />
        </Box>
      </Box>
    );
  }, [
    classes.exposureAnalysisLoadingContainer,
    classes.exposureAnalysisLoadingText,
    classes.exposureAnalysisLoadingTextContainer,
    isExposureAnalysisLoading,
    t,
  ]);

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
          className={classes.analysisPanelParamText}
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
    classes.analysisPanelParamText,
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
      <div id="analysis-parameters" className={classes.analysisPanelParams}>
        <HazardLayerSelector
          value={hazardLayerId}
          onChange={setHazardLayerId}
          className={classes.analysisPanelParamText}
        />
        {renderedPolygonHazardType}
        {renderedRasterType}
      </div>
    );
  }, [
    analysisResult,
    classes.analysisPanelParams,
    classes.analysisPanelParamText,
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
      <div
        className={classes.analysisButtonContainer}
        style={{
          width: PanelSize.medium,
        }}
      >
        <Button
          className={classes.analysisButton}
          disabled={!analysisResult}
          onClick={() => setShowTable(!showTable)}
        >
          <Typography variant="body2">
            {showTable ? t('Hide Table') : t('View Table')}
          </Typography>
        </Button>
        <Button className={classes.analysisButton} onClick={clearAnalysis}>
          <Typography variant="body2">{t('Clear Analysis')}</Typography>
        </Button>
        <Button
          className={classes.bottomButton}
          onClick={() =>
            analysisResult &&
            (analysisResult instanceof BaselineLayerResult ||
              analysisResult instanceof PolygonAnalysisResult) &&
            downloadCSVFromTableData(
              analysisResult,
              translatedColumns,
              selectedDate,
              analysisSortColumn,
              analysisIsAscending ? 'asc' : 'desc',
            )
          }
        >
          <Typography variant="body2">{t('Download CSV')}</Typography>
        </Button>
      </div>
    );
  }, [
    analysisIsAscending,
    analysisResult,
    isAnalysisLoading,
    analysisSortColumn,
    classes.analysisButton,
    classes.analysisButtonContainer,
    classes.bottomButton,
    clearAnalysis,
    selectedDate,
    showTable,
    t,
    translatedColumns,
  ]);

  const renderedRunAnalysisButton = useMemo(() => {
    // Hide button only for exposure analysis (which has its own action buttons)
    if (analysisResult instanceof ExposedPopulationResult) {
      return null;
    }
    return (
      <div className={classes.analysisButtonContainer}>
        {isAnalysisLoading ? <LinearProgress /> : null}
        <Button
          className={classes.bottomButton}
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
      </div>
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
    classes.analysisButtonContainer,
    classes.bottomButton,
    wrappedRunAnalyser,
    t,
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
      <div className={classes.analysisButtonContainer}>
        <ExposureAnalysisActions
          key={`${exposureAnalysisSortColumn} - ${exposureAnalysisIsAscending}`}
          analysisButton={classes.analysisButton}
          bottomButton={classes.bottomButton}
          clearAnalysis={clearAnalysis}
          tableData={exposureAnalysisTableData}
          columns={translatedColumns}
        />
      </div>
    );
  }, [
    analysisResult,
    isAnalysisLoading,
    classes.analysisButton,
    classes.analysisButtonContainer,
    classes.bottomButton,
    clearAnalysis,
    exposureAnalysisIsAscending,
    exposureAnalysisSortColumn,
    exposureAnalysisTableData,
    translatedColumns,
  ]);

  return useMemo(() => {
    if (tabPanelType !== tabValue) {
      return null;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
        <div className={classes.root}>
          <div className={classes.analysisPanel}>
            {renderedExposureAnalysisLoading}
            {renderedExposureAnalysisTable}
            {renderedAnalysisPanelInfo}
            {renderedAnalysisActions}
            {renderedRunAnalysisButton}
          </div>
          {renderedExposureAnalysisActions}
        </div>
        {showTable &&
          !isAnalysisLoading &&
          analysisResult &&
          (analysisResult instanceof BaselineLayerResult ||
            analysisResult instanceof PolygonAnalysisResult) && (
            <Box className={classes.analysisTableContainer}>
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
                  className={classes.analysisTableCloseButton}
                >
                  <CloseRounded />
                </IconButton>
                <Typography className={classes.analysisTableTitle}>
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
    classes.analysisPanel,
    classes.analysisTableCloseButton,
    classes.analysisTableContainer,
    classes.analysisTableTitle,
    classes.root,
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
    translatedColumns,
  ]);
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: PanelSize.medium,
      height: '100%',
      overflow: 'hidden',
    },
    analysisPanel: {
      display: 'flex',
      flexDirection: 'column',
      width: PanelSize.medium,
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
    },
    exposureAnalysisLoadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem',
      height: '100%',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    exposureValueContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: '16px',
    },
    exposureValueOptionsInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      margin: '8px 0',
    },
    exposureValueOptionsSelect: {
      width: '100%',
      '& .MuiFormLabel-root': {
        color: 'black',
        '&:hover fieldset': {
          borderColor: '#333333',
        },
      },
    },
    exposureAnalysisLoadingTextContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    exposureAnalysisLoadingText: {
      color: 'black',
    },
    analysisPanelParams: {
      padding: '30px 10px 10px 10px',
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
    },
    colorBlack: {
      color: 'black',
    },
    analysisPanelParamText: {
      width: '100%',
      color: 'black',
    },
    analysisPanelParamContainer: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 30,
      marginLeft: 10,
      width: '90%',
      color: 'black',
    },
    analysisTableContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
    },
    datePickerContainer: {
      marginLeft: 10,
      width: 'auto',
      color: 'black',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioOptions: {
      color: '#333333',
      opacity: 0.6,
    },
    radioOptionsChecked: {
      color: '#4CA1AD',
      opacity: 1,
    },
    analysisButtonContainer: {
      backgroundColor: theme.palette.primary.main,
      width: '100%',
    },
    analysisButton: {
      backgroundColor: '#788489',
      '&:hover': {
        backgroundColor: '#788489',
      },
      marginTop: 10,
      marginBottom: 10,
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    bottomButton: {
      backgroundColor: cyanBlue,
      marginTop: 10,
      marginBottom: 10,
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': {
        opacity: 0.5,
        backgroundColor: '#788489',
        '&:hover': {
          backgroundColor: '#788489',
        },
      },
    },
    numberField: {
      paddingRight: '10px',
      maxWidth: '140px',
      '& label': {
        color: '#333333',
      },
    },
    rowInputContainer: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '10px',
    },
    calendarPopper: {
      zIndex: 3,
    },
    dateRangePicker: {
      display: 'inline-block',
      marginRight: '15px',
      marginTop: '15px',
      minWidth: '125px',
      width: '100px',
    },
    analysisTableTitle: {
      fontSize: '16px',
      fontWeight: 400,
      color: 'black',
    },
    analysisTableCloseButton: {
      zIndex: theme.zIndex.modal,
      marginLeft: 'auto',
    },
  }),
);

export default AnalysisPanel;
