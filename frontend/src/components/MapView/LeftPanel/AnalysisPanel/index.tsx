import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Button,
  createStyles,
  FormControl,
  FormControlLabel,
  InputAdornment,
  Input,
  LinearProgress,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  withStyles,
  WithStyles,
  IconButton,
  Theme,
  CircularProgress,
  Box,
} from '@material-ui/core';
import {
  BarChartOutlined,
  DateRangeRounded,
  CloseRounded,
} from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import { isNil, orderBy, range } from 'lodash';
import moment from 'moment';
import {
  mapSelector,
  layersSelector,
  layerDataSelector,
} from '../../../../context/mapStateSlice/selectors';
import { useUrlHistory } from '../../../../utils/url-utils';
import { availableDatesSelector } from '../../../../context/serverStateSlice';
import {
  AnalysisDispatchParams,
  PolygonAnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  requestAndStorePolygonAnalysis,
  setIsMapLayerActive,
  isExposureAnalysisLoadingSelector,
  analysisResultSortByKeySelector,
  analysisResultSortOrderSelector,
  setAnalysisResultSortByKey,
  setAnalysisResultSortOrder,
} from '../../../../context/analysisResultStateSlice';
import {
  AdminLevelType,
  AggregationOperations,
  AdminLevelDataLayerProps,
  HazardDataType,
  RasterType,
  WMSLayerProps,
  LayerKey,
  BoundaryLayerProps,
  GeometryType,
  PanelSize,
} from '../../../../config/types';
import {
  getAdminLevelCount,
  getAdminLevelLayer,
} from '../../../../utils/admin-utils';
import { LayerData } from '../../../../context/layers/layer-data';
import {
  LayerDefinitions,
  getDisplayBoundaryLayers,
} from '../../../../config/utils';
import { useSafeTranslation } from '../../../../i18n';
import { getDateFromList } from '../../../../utils/data-utils';
import { getPossibleDatesForLayer } from '../../../../utils/server-utils';
import {
  downloadCSVFromTableData,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
  useAnalysisTableColumns,
  Column,
} from '../../../../utils/analysis-utils';
import {
  refreshBoundaries,
  safeDispatchRemoveLayer,
  safeDispatchAddLayer,
} from '../../../../utils/map-utils';
import { removeLayer } from '../../../../context/mapStateSlice';
import { DEFAULT_DATE_FORMAT } from '../../../../utils/name-utils';
import LayerDropdown from '../../Layers/LayerDropdown';
import SimpleDropdown from '../../../Common/SimpleDropdown';
import AnalysisTable from './AnalysisTable';
import { Extent } from '../../Layers/raster-utils';
import ExposureAnalysisTable from './AnalysisTable/ExposureAnalysisTable';
import ExposureAnalysisActions from './ExposureAnalysisActions';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from '../../../../context/leftPanelStateSlice';

const tabIndex = 2;

function AnalysisPanel({
  extent,
  panelSize,
  setPanelSize,
  setResultsPage,
  classes,
}: AnalysisPanelProps) {
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

  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const analysisResultSortByKey = useSelector(analysisResultSortByKeySelector);
  const analysisResultSortOrder = useSelector(analysisResultSortOrderSelector);
  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);
  const isExposureAnalysisLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );
  const tabValue = useSelector(leftPanelTabValueSelector);
  const [showTable, setShowTable] = useState(false);
  // defaults the sort column of exposure analysis to 'name'
  const [exposureAnalysisSortColumn, setExposureAnalysisSortColumn] = useState<
    Column['id']
  >('name');
  // exposure analysis sort order
  const [
    exposureAnalysisIsAscending,
    setExposureAnalysisIsAscending,
  ] = useState(true);
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
    analysisDate: selectedDateFromUrl,
    analysisStatistic: selectedStatisticFromUrl,
    analysisThresholdAbove: aboveThresholdFromUrl,
    analysisThresholdBelow: belowThresholdFromUrl,
    analysisAdminLevel: adminLevelFromUrl,
    analysisStartDate: selectedStartDateFromUrl,
    analysisEndDate: selectedEndDateFromUrl,
  } = getAnalysisParams();

  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey | undefined>(
    hazardLayerIdFromUrl,
  );
  const [statistic, setStatistic] = useState(
    (selectedStatisticFromUrl as AggregationOperations) ||
      AggregationOperations.Mean,
  );
  const [baselineLayerId, setBaselineLayerId] = useState<LayerKey | undefined>(
    baselineLayerIdFromUrl,
  );
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [belowThreshold, setBelowThreshold] = useState(
    belowThresholdFromUrl || '',
  );
  const [aboveThreshold, setAboveThreshold] = useState(
    aboveThresholdFromUrl || '',
  );
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  // for polygon intersection analysis
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(
    Number(adminLevelFromUrl || '1') as AdminLevelType,
  );
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  // find layer for the given adminLevel
  const adminLevelLayer = getAdminLevelLayer(adminLevel);
  const adminLevelLayerData = useSelector(
    // if we couldn't find an admin layer, just return undefined
    adminLevelLayer ? layerDataSelector(adminLevelLayer.id) : () => undefined,
  ) as LayerData<BoundaryLayerProps> | undefined;

  // get variables derived from state
  const selectedHazardLayer = hazardLayerId
    ? (LayerDefinitions[hazardLayerId] as WMSLayerProps)
    : null;
  const hazardDataType: HazardDataType | null = selectedHazardLayer
    ? selectedHazardLayer.geometry || RasterType.Raster
    : null;
  const availableHazardDates = selectedHazardLayer
    ? getPossibleDatesForLayer(selectedHazardLayer, availableDates)?.map(
        d => new Date(d),
      ) || []
    : undefined;

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState<
    LayerKey | undefined
  >(preSelectedBaselineLayer?.id);

  const { t } = useSafeTranslation();

  // check if there is any available date from the url, otherwise use last available date for the selected hazard layer
  const lastAvailableHazardDate = availableHazardDates
    ? getDateFromList(
        selectedDateFromUrl ? new Date(selectedDateFromUrl) : null,
        availableHazardDates,
      )?.getTime() || null
    : null;
  const lastAvailableHazardStartDate = availableHazardDates
    ? getDateFromList(
        selectedStartDateFromUrl ? new Date(selectedStartDateFromUrl) : null,
        availableHazardDates,
      )?.getTime() || null
    : null;
  const lastAvailableHazardEndDate = availableHazardDates
    ? getDateFromList(
        selectedEndDateFromUrl ? new Date(selectedEndDateFromUrl) : null,
        availableHazardDates,
      )?.getTime() || null
    : null;
  const { translatedColumns } = useAnalysisTableColumns(analysisResult);

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    if (isNil(lastAvailableHazardDate)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(lastAvailableHazardDate);
    }
    if (isNil(lastAvailableHazardStartDate)) {
      setStartDate(null);
    } else {
      setStartDate(lastAvailableHazardStartDate);
    }
    if (isNil(lastAvailableHazardEndDate)) {
      setEndDate(null);
    } else {
      setEndDate(lastAvailableHazardEndDate);
    }
  }, [
    availableDates,
    hazardLayerId,
    lastAvailableHazardDate,
    lastAvailableHazardStartDate,
    lastAvailableHazardEndDate,
  ]);

  // Only epxand if analysis results are available.
  useEffect(() => {
    if (!analysisResult) {
      setShowTable(false);
    }
  }, [analysisResult]);

  // The analysis table data
  const analysisTableData = useMemo(() => {
    return orderBy(
      analysisResult?.tableData,
      analysisSortColumn,
      analysisIsAscending ? 'asc' : 'desc',
    );
  }, [analysisIsAscending, analysisResult, analysisSortColumn]);

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

  useEffect(() => {
    if (tabValue !== tabIndex) {
      return;
    }

    if (showTable) {
      setPanelSize(PanelSize.large);
      if (
        !isAnalysisLoading &&
        analysisResult &&
        (analysisResult instanceof BaselineLayerResult ||
          analysisResult instanceof PolygonAnalysisResult)
      ) {
        setResultsPage(
          <div className={classes.analysisTableContainer}>
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
                {selectedHazardLayer?.title}
              </Typography>
            </div>
            <div className={classes.analysisTable}>
              <AnalysisTable
                tableData={analysisTableData}
                columns={translatedColumns}
                sortColumn={analysisSortColumn}
                handleChangeOrderBy={handleAnalysisTableOrderBy}
                isAscending={analysisIsAscending}
              />
            </div>
          </div>,
        );
      }
    } else {
      setPanelSize(PanelSize.medium);
      setResultsPage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showTable,
    tabValue,
    analysisTableData,
    analysisSortColumn,
    handleAnalysisTableOrderBy,
    analysisIsAscending,
  ]);

  const onOptionChange = useCallback(
    <T extends string>(setterFunc: Dispatch<SetStateAction<T>>) => (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const value = event.target.value as T;
      setterFunc(value);
      return value;
    },
    [],
  );
  // specially for threshold values, also does error checking
  const onThresholdOptionChange = useCallback(
    (thresholdType: 'above' | 'below') => (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const setterFunc =
        thresholdType === 'above' ? setAboveThreshold : setBelowThreshold;
      const changedOption = onOptionChange(setterFunc)(event);
      // setting a value doesn't update the existing value until next render, therefore we must decide whether to access the old one or the newly change one here.
      const aboveThresholdValue = parseFloat(
        thresholdType === 'above' ? changedOption : aboveThreshold,
      );
      const belowThresholdValue = parseFloat(
        thresholdType === 'below' ? changedOption : belowThreshold,
      );
      if (belowThresholdValue > aboveThresholdValue) {
        setThresholdError('Below threshold is larger than above threshold!');
      } else {
        setThresholdError(null);
      }
    },
    [aboveThreshold, belowThreshold, onOptionChange],
  );

  const statisticOptions = useMemo(() => {
    return Object.entries(AggregationOperations)
      .filter(([, value]) => value !== AggregationOperations.Sum) // sum is used only for exposure analysis.
      .map(([key, value]) => (
        <FormControlLabel
          key={key}
          value={value}
          control={
            <Radio
              classes={{
                root: classes.radioOptions,
                checked: classes.radioOptionsChecked,
              }}
              color="default"
              size="small"
            />
          }
          label={
            <Typography className={classes.analysisPanelParamText}>
              {t(key)}
            </Typography>
          }
        />
      ));
  }, [
    classes.analysisPanelParamText,
    classes.radioOptions,
    classes.radioOptionsChecked,
    t,
  ]);

  const activateUniqueBoundary = useCallback(
    (forceAdminLevel?: BoundaryLayerProps) => {
      if (forceAdminLevel) {
        // remove displayed boundaries
        getDisplayBoundaryLayers().forEach(l => {
          if (l.id !== forceAdminLevel.id) {
            safeDispatchRemoveLayer(map, l, dispatch);
          }
        });

        safeDispatchAddLayer(
          map,
          { ...forceAdminLevel, isPrimary: true },
          dispatch,
        );
        return;
      }

      if (!baselineLayerId) {
        throw new Error('Layer should be selected to run analysis');
      }

      const baselineLayer = LayerDefinitions[
        baselineLayerId
      ] as AdminLevelDataLayerProps;

      if (baselineLayer.boundary) {
        const boundaryLayer = LayerDefinitions[
          baselineLayer.boundary
        ] as BoundaryLayerProps;
        // remove displayed boundaries
        getDisplayBoundaryLayers().forEach(l => {
          if (l.id !== boundaryLayer.id) {
            safeDispatchRemoveLayer(map, l, dispatch);
          }
        });

        safeDispatchAddLayer(
          map,
          { ...boundaryLayer, isPrimary: true },
          dispatch,
        );
      } else {
        getDisplayBoundaryLayers().forEach(l => {
          safeDispatchAddLayer(map, l, dispatch);
        });
      }
    },
    [baselineLayerId, dispatch, map],
  );

  const clearAnalysis = useCallback(() => {
    const isClearingExposureAnalysis =
      analysisResult instanceof ExposedPopulationResult;
    dispatch(clearAnalysisResult());
    setPanelSize(PanelSize.medium);
    if (isClearingExposureAnalysis) {
      dispatch(setTabValue(0));
    }
    setHazardLayerId(hazardLayerIdFromUrl);
    setStatistic(
      (selectedStatisticFromUrl as AggregationOperations) ||
        AggregationOperations.Mean,
    );
    setBaselineLayerId(baselineLayerIdFromUrl);
    setBelowThreshold(belowThresholdFromUrl || '');
    setAboveThreshold(aboveThresholdFromUrl || '');
    setThresholdError(null);

    resetAnalysisParams();
    refreshBoundaries(map, dispatch);

    if (previousBaselineId) {
      const previousBaseline = LayerDefinitions[
        previousBaselineId
      ] as AdminLevelDataLayerProps;
      updateHistory(BASELINE_URL_LAYER_KEY, previousBaselineId);
      safeDispatchAddLayer(map, previousBaseline, dispatch);
      // check isMapLayerActive on analysis clear
      // to avoid miss behaviour on boundary layers
      dispatch(setIsMapLayerActive(true));
    }
  }, [
    aboveThresholdFromUrl,
    analysisResult,
    baselineLayerIdFromUrl,
    belowThresholdFromUrl,
    dispatch,
    hazardLayerIdFromUrl,
    map,
    previousBaselineId,
    resetAnalysisParams,
    selectedStatisticFromUrl,
    setPanelSize,
    updateHistory,
  ]);

  const runAnalyser = useCallback(async () => {
    if (preSelectedBaselineLayer) {
      setPreviousBaselineId(preSelectedBaselineLayer.id);
      removeKeyFromUrl(BASELINE_URL_LAYER_KEY);
      // no need to safely dispatch remove we are sure
      dispatch(removeLayer(preSelectedBaselineLayer));
    }

    if (analysisResult) {
      clearAnalysis();
    }

    if (!extent) {
      return;
    } // hasn't been calculated yet

    if (!selectedHazardLayer) {
      throw new Error('Hazard layer should be selected to run analysis');
    }

    if (hazardDataType === GeometryType.Polygon) {
      if (!startDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!endDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!adminLevelLayer || !adminLevelLayerData) {
        // technically we can't get here because the run analysis button
        // is disabled while the admin level data loads
        // but we have to put this in so the typescript compiler
        // doesn't throw an error when we try to access the data
        // property of adminLevelLayerData
        throw new Error('Admin level data is still loading');
      }

      const params: PolygonAnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        adminLevel,
        adminLevelLayer,
        adminLevelData: adminLevelLayerData.data,
        startDate,
        endDate,
        extent,
      };
      activateUniqueBoundary(adminLevelLayer);
      // update history
      updateAnalysisParams({
        analysisHazardLayerId: hazardLayerId,
        analysisAdminLevel: adminLevel.toString(),
        analysisStartDate: moment(startDate).format(DEFAULT_DATE_FORMAT),
        analysisEndDate: moment(endDate).format(DEFAULT_DATE_FORMAT),
        analysisStatistic: statistic,
      });
      dispatch(requestAndStorePolygonAnalysis(params));
    } else {
      if (!selectedDate) {
        throw new Error('Date must be given to run analysis');
      }

      if (!baselineLayerId) {
        throw new Error('Baseline layer should be selected to run analysis');
      }

      const selectedBaselineLayer = LayerDefinitions[
        baselineLayerId
      ] as AdminLevelDataLayerProps;

      activateUniqueBoundary();

      const params: AnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        baselineLayer: selectedBaselineLayer,
        date: selectedDate,
        statistic,
        extent,
        threshold: {
          above: parseFloat(aboveThreshold) || undefined,
          below: parseFloat(belowThreshold) || undefined,
        },
      };

      // update history
      updateAnalysisParams({
        analysisHazardLayerId: hazardLayerId,
        analysisBaselineLayerId: baselineLayerId,
        analysisDate: moment(selectedDate).format(DEFAULT_DATE_FORMAT),
        analysisStatistic: statistic,
        analysisThresholdAbove: aboveThreshold || undefined,
        analysisThresholdBelow: belowThreshold || undefined,
      });

      dispatch(requestAndStoreAnalysis(params));
    }
  }, [
    aboveThreshold,
    activateUniqueBoundary,
    adminLevel,
    adminLevelLayer,
    adminLevelLayerData,
    analysisResult,
    baselineLayerId,
    belowThreshold,
    clearAnalysis,
    dispatch,
    endDate,
    extent,
    hazardDataType,
    hazardLayerId,
    preSelectedBaselineLayer,
    removeKeyFromUrl,
    selectedDate,
    selectedHazardLayer,
    startDate,
    statistic,
    updateAnalysisParams,
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
    },
    [exposureAnalysisIsAscending, exposureAnalysisSortColumn],
  );

  // The exposure analysis table data
  const exposureAnalysisTableData = useMemo(() => {
    return orderBy(
      analysisResult?.tableData,
      exposureAnalysisSortColumn,
      exposureAnalysisIsAscending ? 'asc' : 'desc',
    );
  }, [analysisResult, exposureAnalysisIsAscending, exposureAnalysisSortColumn]);

  const renderedExposureAnalysisLoading = useMemo(() => {
    if (!isExposureAnalysisLoading) {
      return null;
    }
    return (
      <Box className={classes.exposureAnalysisLoadingContainer}>
        <CircularProgress size={100} />
      </Box>
    );
  }, [classes.exposureAnalysisLoadingContainer, isExposureAnalysisLoading]);

  const renderedExposureAnalysisTable = useMemo(() => {
    if (!(analysisResult instanceof ExposedPopulationResult)) {
      return null;
    }
    return (
      <div className={classes.exposureAnalysisTable}>
        <ExposureAnalysisTable
          tableData={exposureAnalysisTableData}
          columns={translatedColumns}
          maxResults={1000}
          sortColumn={exposureAnalysisSortColumn}
          handleChangeOrderBy={handleExposureAnalysisTableOrderBy}
          isAscending={exposureAnalysisIsAscending}
        />
      </div>
    );
  }, [
    analysisResult,
    classes.exposureAnalysisTable,
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
        <div className={classes.analysisPanelParamContainer}>
          <Typography className={classes.analysisParamTitle} variant="body2">
            {t('Admin Level')}
          </Typography>
          <SimpleDropdown
            value={adminLevel}
            options={range(getAdminLevelCount()).map(i => [
              (i + 1) as AdminLevelType,
              `Admin ${i + 1}`,
            ])}
            onChange={setAdminLevel}
            textClass={classes.analysisParamTitle}
          />
        </div>

        <div className={classes.analysisPanelParamContainer}>
          <Typography className={classes.analysisParamTitle} variant="body2">
            {t('Date Range')}
          </Typography>
          <div className={classes.dateRangePicker}>
            <Typography className={classes.analysisParamTitle} variant="body2">
              {t('Start')}
            </Typography>
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={date => setStartDate(date?.getTime() || startDate)}
              maxDate={new Date()}
              todayButton="Today"
              peekNextMonth
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              customInput={<Input className={classes.analysisPanelParamText} />}
              popperClassName={classes.calendarPopper}
              includeDates={availableHazardDates}
            />
          </div>
          <div className={classes.dateRangePicker}>
            <Typography className={classes.analysisParamTitle} variant="body2">
              {t('End')}
            </Typography>
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={date => setEndDate(date?.getTime() || endDate)}
              maxDate={new Date()}
              todayButton="Today"
              peekNextMonth
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              customInput={<Input className={classes.analysisPanelParamText} />}
              popperClassName={classes.calendarPopper}
              includeDates={availableHazardDates}
            />
          </div>
        </div>
      </>
    );
  }, [
    adminLevel,
    availableHazardDates,
    classes.analysisPanelParamContainer,
    classes.analysisPanelParamText,
    classes.analysisParamTitle,
    classes.calendarPopper,
    classes.dateRangePicker,
    endDate,
    hazardDataType,
    startDate,
    t,
  ]);

  const renderedRasterType = useMemo(() => {
    if (hazardDataType !== RasterType.Raster) {
      return null;
    }
    return (
      <>
        <div className={classes.analysisPanelParamContainer}>
          <LayerDropdown
            type="admin_level_data"
            value={baselineLayerId || undefined}
            setValue={setBaselineLayerId}
            className={classes.analysisPanelParamText}
            label={t('Baseline Layer')}
            placeholder="Choose baseline layer"
          />
        </div>
        <div className={classes.analysisPanelParamContainer}>
          <Typography className={classes.analysisParamTitle} variant="body2">
            {t('Statistic')}
          </Typography>
          <FormControl component="div">
            <RadioGroup
              name="statistics"
              value={statistic}
              onChange={onOptionChange(setStatistic)}
            >
              {statisticOptions}
            </RadioGroup>
          </FormControl>
        </div>
        <div className={classes.analysisPanelParamContainer}>
          <Typography className={classes.analysisParamTitle} variant="body2">
            {t('Threshold')}
          </Typography>
          <div style={{ display: 'flex' }}>
            <TextField
              id="outlined-number-low"
              error={!!thresholdError}
              helperText={t(thresholdError || '')}
              className={classes.numberField}
              label={t('Below')}
              type="number"
              value={belowThreshold}
              onChange={onThresholdOptionChange('below')}
              variant="outlined"
            />
            <TextField
              id="outlined-number-high"
              label={t('Above')}
              classes={{ root: classes.numberField }}
              value={aboveThreshold}
              onChange={onThresholdOptionChange('above')}
              type="number"
              variant="outlined"
            />
          </div>
        </div>
        <div className={classes.datePickerContainer}>
          <Typography className={classes.analysisParamTitle} variant="body2">
            {`${t('Date')}: `}
          </Typography>
          <DatePicker
            locale={t('date_locale')}
            dateFormat="PP"
            selected={selectedDate ? new Date(selectedDate) : null}
            onChange={date => setSelectedDate(date?.getTime() || selectedDate)}
            maxDate={new Date()}
            todayButton={t('Today')}
            peekNextMonth
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            customInput={
              <Input
                className={classes.analysisPanelParamText}
                disableUnderline
                endAdornment={
                  <InputAdornment position="end">
                    <DateRangeRounded />
                  </InputAdornment>
                }
              />
            }
            popperClassName={classes.calendarPopper}
            includeDates={availableHazardDates}
          />
        </div>
      </>
    );
  }, [
    aboveThreshold,
    availableHazardDates,
    baselineLayerId,
    belowThreshold,
    classes.analysisPanelParamContainer,
    classes.analysisPanelParamText,
    classes.analysisParamTitle,
    classes.calendarPopper,
    classes.datePickerContainer,
    classes.numberField,
    hazardDataType,
    onOptionChange,
    onThresholdOptionChange,
    selectedDate,
    statistic,
    statisticOptions,
    t,
    thresholdError,
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
        <div className={classes.analysisPanelParamContainer}>
          <LayerDropdown
            type="wms"
            value={hazardLayerId}
            setValue={setHazardLayerId}
            className={classes.analysisPanelParamText}
            label={t('Hazard Layer')}
            placeholder="Choose hazard layer"
          />
        </div>
        {renderedPolygonHazardType}
        {renderedRasterType}
      </div>
    );
  }, [
    analysisResult,
    classes.analysisPanelParamContainer,
    classes.analysisPanelParamText,
    classes.analysisPanelParams,
    hazardLayerId,
    isExposureAnalysisLoading,
    renderedPolygonHazardType,
    renderedRasterType,
    t,
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
            {panelSize === PanelSize.large ? t('Hide Table') : t('View Table')}
          </Typography>
        </Button>
        <Button className={classes.analysisButton} onClick={clearAnalysis}>
          <Typography variant="body2">{t('Clear Analysis')}</Typography>
        </Button>
        <Button
          className={classes.bottomButton}
          onClick={() =>
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
    analysisSortColumn,
    classes.analysisButton,
    classes.analysisButtonContainer,
    classes.bottomButton,
    clearAnalysis,
    isAnalysisLoading,
    panelSize,
    selectedDate,
    showTable,
    t,
    translatedColumns,
  ]);

  const renderedRunAnalysisButton = useMemo(() => {
    if (analysisResult) {
      return null;
    }
    return (
      <div className={classes.analysisButtonContainer}>
        <Button
          className={classes.bottomButton}
          onClick={runAnalyser}
          startIcon={<BarChartOutlined />}
          disabled={
            !!thresholdError || // if there is a threshold error
            isAnalysisLoading || // or analysis is currently loading
            !hazardLayerId || // or hazard layer hasn't been selected
            (hazardDataType === GeometryType.Polygon
              ? !startDate || !endDate || !adminLevelLayerData
              : !selectedDate || !baselineLayerId) // or date hasn't been selected // or baseline layer hasn't been selected
          }
        >
          <Typography variant="body2">{t('Run Analysis')}</Typography>
        </Button>
        {isAnalysisLoading ? <LinearProgress /> : null}
      </div>
    );
  }, [
    adminLevelLayerData,
    analysisResult,
    baselineLayerId,
    classes.analysisButtonContainer,
    classes.bottomButton,
    endDate,
    hazardDataType,
    hazardLayerId,
    isAnalysisLoading,
    runAnalyser,
    selectedDate,
    startDate,
    t,
    thresholdError,
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
      <div
        className={classes.analysisButtonContainer}
        style={{
          width: panelSize === PanelSize.large ? '50%' : '100%',
        }}
      >
        <ExposureAnalysisActions
          key={`${exposureAnalysisSortColumn} - ${exposureAnalysisIsAscending}`} // Whether to rerender the report doc based on the sort order and column
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
    classes.analysisButton,
    classes.analysisButtonContainer,
    classes.bottomButton,
    clearAnalysis,
    exposureAnalysisIsAscending,
    exposureAnalysisSortColumn,
    exposureAnalysisTableData,
    isAnalysisLoading,
    panelSize,
    translatedColumns,
  ]);

  return useMemo(() => {
    if (tabIndex !== tabValue) {
      return null;
    }

    return (
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
    );
  }, [
    classes.analysisPanel,
    classes.root,
    renderedAnalysisActions,
    renderedAnalysisPanelInfo,
    renderedExposureAnalysisActions,
    renderedExposureAnalysisLoading,
    renderedExposureAnalysisTable,
    renderedRunAnalysisButton,
    tabValue,
  ]);
}

const styles = (theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
    },
    analysisPanel: {
      display: 'relative',
      paddingTop: 30,
      width: PanelSize.medium,
    },
    exposureAnalysisLoadingContainer: {
      display: 'flex',
      height: '100%',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    analysisPanelParams: {
      padding: 10,
      position: 'fixed',
      width: '30%',
    },
    analysisParamTitle: {
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
      width: '50%',
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
      position: 'absolute',
      backgroundColor: '#566064',
      width: '100%',
      bottom: 0,
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
      backgroundColor: '#62B2BD',
      '&:hover': {
        backgroundColor: '#62B2BD',
      },
      marginTop: 10,
      marginBottom: 10,
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    numberField: {
      paddingRight: '10px',
      marginTop: '10px',
      maxWidth: '140px',
      '& .MuiInputBase-root': {
        color: 'black',
      },
      '& label': {
        color: '#333333',
      },
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
    exposureAnalysisTable: {
      // to remove after refactor: analysis panel should be a flex container and the bottom buttons should not be position absolute
      maxHeight: 'calc(80vh - 143px)',
    },
    analysisTable: {
      maxHeight: '75vh',
      maxWidth: '96%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

interface AnalysisPanelProps extends WithStyles<typeof styles> {
  extent?: Extent;
  panelSize: PanelSize;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  setResultsPage: React.Dispatch<React.SetStateAction<JSX.Element | null>>;
}

export default withStyles(styles)(AnalysisPanel);
