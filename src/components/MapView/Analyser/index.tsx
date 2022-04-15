import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  ChangeEvent,
} from 'react';
import {
  Box,
  Button,
  createStyles,
  FormControl,
  FormControlLabel,
  FormGroup,
  Input,
  LinearProgress,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { ArrowDropDown, BarChart } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import { isNil, range } from 'lodash';
import {
  LayerDefinitions,
  getDisplayBoundaryLayers,
} from '../../../config/utils';
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
} from '../../../config/types';

import {
  getAdminLevelCount,
  getAdminLevelLayer,
} from '../../../utils/admin-utils';
import { Extent } from '../Layers/raster-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import {
  AnalysisDispatchParams,
  PolygonAnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLayerActiveSelector,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  requestAndStorePolygonAnalysis,
  setIsMapLayerActive,
} from '../../../context/analysisResultStateSlice';
import AnalysisTable from './AnalysisTable';
import SimpleDropdown from '../../Common/SimpleDropdown';
import {
  getAnalysisTableColumns,
  downloadCSVFromTableData,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from '../../../utils/analysis-utils';
import LayerDropdown from '../Layers/LayerDropdown';
import {
  safeDispatchRemoveLayer,
  safeDispatchAddLayer,
} from '../../../utils/map-utils';
import { LayerData } from '../../../context/layers/layer-data';
import {
  mapSelector,
  layersSelector,
  layerDataSelector,
} from '../../../context/mapStateSlice/selectors';
import { getPossibleDatesForLayer } from '../../../utils/server-utils';
import { useUrlHistory } from '../../../utils/url-utils';
import { removeLayer } from '../../../context/mapStateSlice';
import { useSafeTranslation } from '../../../i18n';

function Analyser({ extent, classes }: AnalyserProps) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const selectedLayers = useSelector(layersSelector);
  const { updateHistory, removeKeyFromUrl } = useUrlHistory();

  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);

  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);
  const isMapLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const [isAnalyserFormOpen, setIsAnalyserFormOpen] = useState(false);
  const [isTableViewOpen, setIsTableViewOpen] = useState(true);

  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey>();
  const [statistic, setStatistic] = useState(AggregationOperations.Mean);
  const [baselineLayerId, setBaselineLayerId] = useState<LayerKey>();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const [belowThreshold, setBelowThreshold] = useState('');
  const [aboveThreshold, setAboveThreshold] = useState('');
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  // for polygon intersection analysis
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(1);
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
  const lastAvailableHazardDate =
    Array.isArray(availableHazardDates) && availableHazardDates.length > 0
      ? availableHazardDates[availableHazardDates.length - 1].getTime()
      : null;

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState<
    LayerKey | undefined
  >(preSelectedBaselineLayer?.id);

  const { t } = useSafeTranslation();

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    if (isNil(lastAvailableHazardDate)) {
      setSelectedDate(null);
      setStartDate(null);
      setEndDate(null);
    } else {
      setSelectedDate(lastAvailableHazardDate);
      setStartDate(lastAvailableHazardDate);
      setEndDate(lastAvailableHazardDate);
    }
  }, [availableDates, hazardLayerId, lastAvailableHazardDate]);

  const onOptionChange = <T extends string>(
    setterFunc: Dispatch<SetStateAction<T>>,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as T;
    setterFunc(value);
    return value;
  };
  // specially for threshold values, also does error checking
  const onThresholdOptionChange = (thresholdType: 'above' | 'below') => (
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
  };

  const statisticOptions = Object.entries(AggregationOperations)
    .filter(([, value]) => value !== AggregationOperations.Sum) // sum is used only for exposure analysis.
    .map(([key, value]) => (
      <FormControlLabel
        key={key}
        value={value}
        control={
          <Radio
            className={classes.radioOptions}
            color="default"
            size="small"
          />
        }
        label={t(key)}
      />
    ));
  const activateUniqueBoundary = (forceAdminLevel?: BoundaryLayerProps) => {
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
  };

  const deactivateUniqueBoundary = () => {
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
      if (!getDisplayBoundaryLayers().includes(boundaryLayer)) {
        safeDispatchRemoveLayer(map, boundaryLayer, dispatch);
      }
    }

    getDisplayBoundaryLayers().forEach(l => {
      safeDispatchAddLayer(map, l, dispatch);
    });
  };

  const clearAnalysis = () => {
    dispatch(clearAnalysisResult());

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
  };

  const onMapSwitchChange = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(setIsMapLayerActive(e.target.checked));

    // hazard layer doesn't needs a display boundary
    // because it is already a vector
    if (hazardDataType === GeometryType.Polygon) {
      return;
    }

    if (isMapLayerActive) {
      deactivateUniqueBoundary();
      // check for previous baseline and bring it back
      if (previousBaselineId) {
        const previousBaseline = LayerDefinitions[
          previousBaselineId
        ] as AdminLevelDataLayerProps;
        updateHistory(BASELINE_URL_LAYER_KEY, previousBaselineId);
        safeDispatchAddLayer(map, previousBaseline, dispatch);
      }
    } else {
      // check for previous baseline and remove it before...
      if (previousBaselineId) {
        const previousBaseline = LayerDefinitions[
          previousBaselineId
        ] as AdminLevelDataLayerProps;
        removeKeyFromUrl(BASELINE_URL_LAYER_KEY);
        safeDispatchRemoveLayer(map, previousBaseline, dispatch);
      }

      // activating the unique boundary layer
      activateUniqueBoundary();
    }
  };

  const runAnalyser = async () => {
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
        // technically we can't get here because the run analaysis button
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
        isExposure: false,
      };

      dispatch(requestAndStoreAnalysis(params));
    }
  };

  return (
    <div className={classes.analyser}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setIsAnalyserFormOpen(!isAnalyserFormOpen);
        }}
      >
        <BarChart fontSize="small" />
        <Typography variant="body2" className={classes.analyserLabel}>
          {t('Run Analysis')}
        </Typography>
        <ArrowDropDown fontSize="small" />
      </Button>

      <Box
        className={classes.analyserMenu}
        width={isAnalyserFormOpen ? 'min-content' : 0}
        padding={isAnalyserFormOpen ? '10px' : 0}
      >
        {isAnalyserFormOpen ? (
          <div>
            <div className={classes.newAnalyserContainer}>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">{t('Hazard Layer')}</Typography>
                <LayerDropdown
                  type="wms"
                  value={hazardLayerId}
                  setValue={setHazardLayerId}
                  className={classes.selector}
                  placeholder="Choose hazard layer"
                />
              </div>

              {hazardDataType === GeometryType.Polygon && (
                <>
                  <div className={classes.analyserOptions}>
                    <Typography variant="body2">Admin Level</Typography>
                    <SimpleDropdown
                      value={adminLevel}
                      options={range(getAdminLevelCount()).map(i => [
                        (i + 1) as AdminLevelType,
                        `Admin ${i + 1}`,
                      ])}
                      onChange={setAdminLevel}
                    />
                  </div>

                  <div className={classes.analyserOptions}>
                    <Typography variant="body2">{t('Date Range')}</Typography>
                    <div className={classes.dateRangePicker}>
                      <Typography variant="body2">{t('Start')}</Typography>
                      <DatePicker
                        selected={startDate ? new Date(startDate) : null}
                        onChange={date =>
                          setStartDate(date?.getTime() || startDate)
                        }
                        maxDate={new Date()}
                        todayButton="Today"
                        peekNextMonth
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        customInput={<Input />}
                        popperClassName={classes.calendarPopper}
                        includeDates={availableHazardDates}
                      />
                    </div>
                    <div className={classes.dateRangePicker}>
                      <Typography variant="body2">{t('End')}</Typography>
                      <DatePicker
                        selected={endDate ? new Date(endDate) : null}
                        onChange={date =>
                          setEndDate(date?.getTime() || endDate)
                        }
                        maxDate={new Date()}
                        todayButton="Today"
                        peekNextMonth
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        customInput={<Input />}
                        popperClassName={classes.calendarPopper}
                        includeDates={availableHazardDates}
                      />
                    </div>
                  </div>
                </>
              )}

              {hazardDataType === RasterType.Raster && (
                <>
                  <div className={classes.analyserOptions}>
                    <Typography variant="body2">{t('Statistic')}</Typography>
                    <FormControl component="div">
                      <RadioGroup
                        name="statistics"
                        value={statistic}
                        onChange={onOptionChange(setStatistic)}
                        row
                      >
                        {statisticOptions}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <div className={classes.analyserOptions}>
                    <Typography variant="body2">
                      {t('Baseline Layer')}
                    </Typography>
                    <LayerDropdown
                      type="admin_level_data"
                      value={baselineLayerId}
                      setValue={setBaselineLayerId}
                      className={classes.selector}
                      placeholder="Choose baseline layer"
                    />
                  </div>
                  <div className={classes.analyserOptions}>
                    <Typography variant="body2">{t('Threshold')}</Typography>
                    <TextField
                      id="filled-number"
                      error={!!thresholdError}
                      helperText={thresholdError}
                      className={classes.numberField}
                      label={t('Below')}
                      type="number"
                      value={belowThreshold}
                      onChange={onThresholdOptionChange('below')}
                      variant="filled"
                    />
                    <TextField
                      id="filled-number"
                      label={t('Above')}
                      className={classes.numberField}
                      value={aboveThreshold}
                      onChange={onThresholdOptionChange('above')}
                      type="number"
                      variant="filled"
                    />
                  </div>
                  <div className={classes.analyserOptions}>
                    <Typography variant="body2">{t('Date')}</Typography>
                    <DatePicker
                      locale={t('date_locale')}
                      dateFormat="PP"
                      selected={selectedDate ? new Date(selectedDate) : null}
                      onChange={date =>
                        setSelectedDate(date?.getTime() || selectedDate)
                      }
                      maxDate={new Date()}
                      todayButton={t('Today')}
                      peekNextMonth
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      customInput={<Input />}
                      popperClassName={classes.calendarPopper}
                      includeDates={availableHazardDates}
                    />
                  </div>
                </>
              )}
            </div>

            {!isAnalysisLoading &&
              analysisResult &&
              (analysisResult instanceof BaselineLayerResult ||
                analysisResult instanceof PolygonAnalysisResult) && (
                <>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          color="default"
                          checked={isMapLayerActive}
                          onChange={onMapSwitchChange}
                        />
                      }
                      label={t('Map View')}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          color="default"
                          checked={isTableViewOpen}
                          onChange={e => setIsTableViewOpen(e.target.checked)}
                        />
                      }
                      label={t('Table View')}
                    />
                  </FormGroup>
                  {isTableViewOpen && (
                    <AnalysisTable
                      tableData={analysisResult.tableData}
                      columns={
                        'tableColumns' in analysisResult
                          ? // have to add "as any" here because typescript compiler mistakenly thinks
                            // analysisResult is a union of BaselineLayerResult and PolygonAnalysisResult
                            (analysisResult as PolygonAnalysisResult)
                              .tableColumns
                          : getAnalysisTableColumns(analysisResult)
                      }
                    />
                  )}
                  <Button
                    className={classes.innerAnalysisButton}
                    onClick={() => downloadCSVFromTableData(analysisResult)}
                  >
                    <Typography variant="body2">{t('Download')}</Typography>
                  </Button>
                  <Button
                    className={classes.innerAnalysisButton}
                    onClick={clearAnalysis}
                  >
                    <Typography variant="body2">
                      {t('Clear Analysis')}
                    </Typography>
                  </Button>
                </>
              )}
            {(!analysisResult ||
              analysisResult instanceof ExposedPopulationResult) && (
              <Button
                className={classes.innerAnalysisButton}
                onClick={runAnalyser}
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
            )}
            {isAnalysisLoading ? <LinearProgress /> : null}
          </div>
        ) : null}
      </Box>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    analyser: {
      zIndex: theme.zIndex.drawer,
      textAlign: 'left',
    },
    analyserLabel: {
      marginLeft: '10px',
    },
    analyserMenu: {
      backgroundColor: '#5A686C',
      maxWidth: '100vw',
      color: 'white',
      overflowX: 'hidden',
      whiteSpace: 'nowrap',
      borderTopRightRadius: '10px',
      borderBottomRightRadius: '10px',
      height: 'auto',
      maxHeight: '60vh',
      width: 'fit-content',
    },
    analyserButton: {
      height: '36px',
      'margin-left': '3px',
    },
    analyserOptions: {
      padding: '5px 0px',
    },
    newAnalyserContainer: {
      padding: '5px',
      marginTop: '10px',
    },
    radioOptions: {
      '&.Mui-checked': { color: grey[50] },
      padding: '2px 10px 2px 20px',
    },
    innerAnalysisButton: {
      backgroundColor: '#3d474a',
      margin: '10px',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    selectorLabel: {
      '&.Mui-focused': { color: 'white' },
    },
    selector: {
      margin: '5px',
    },
    numberField: {
      paddingRight: '10px',
      marginTop: '10px',
      maxWidth: '140px',
      '& .Mui-focused': { color: 'white' },
    },
    calendarPopper: {
      zIndex: 3,
    },
    dateRangePicker: {
      display: 'inline-block',
      marginRight: '15px',
      minWidth: '125px',
      width: '100px',
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {
  extent?: Extent;
}

export default withStyles(styles)(Analyser);
