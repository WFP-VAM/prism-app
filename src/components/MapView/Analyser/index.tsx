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
import {
  LayerDefinitions,
  getDisplayBoundaryLayers,
} from '../../../config/utils';
import {
  AggregationOperations,
  AdminLevelDataLayerProps,
  WMSLayerProps,
  LayerKey,
  BoundaryLayerProps,
} from '../../../config/types';

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
import {
  getAnalysisTableColumns,
  downloadCSVFromTableData,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from '../../../utils/analysis-utils';
import AdminLevelDropdown from '../Layers/AdminLevelDropdown';
import LayerDropdown from '../Layers/LayerDropdown';
import {
  safeDispatchRemoveLayer,
  safeDispatchAddLayer,
} from '../../../utils/map-utils';
import {
  mapSelector,
  layersSelector,
} from '../../../context/mapStateSlice/selectors';
import { useUrlHistory } from '../../../utils/url-utils';
import { removeLayer } from '../../../context/mapStateSlice';

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
  const [analysisType, setAnalysisType] = useState('ADMIN');
  const [adminLevel, setAdminLevel] = useState('1');
  const [hazardGeometryType, setHazardGeometryType] = useState(null);
  const [statistic, setStatistic] = useState(AggregationOperations.Mean);
  const [baselineLayerId, setBaselineLayerId] = useState<LayerKey>();

  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  const [belowThreshold, setBelowThreshold] = useState('');
  const [aboveThreshold, setAboveThreshold] = useState('');
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const displayDateRange = Boolean(hazardGeometryType);

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState<
    LayerKey | undefined
  >(preSelectedBaselineLayer?.id);

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    const dates = hazardLayerId
      ? availableDates[
          (LayerDefinitions[hazardLayerId] as WMSLayerProps)?.serverLayerName
        ]
      : null;
    if (!dates || dates.length === 0) {
      setSelectedDate(null);
      setStartDate(null);
      setEndDate(null);
    } else {
      const lastDate = dates[dates.length - 1];
      setSelectedDate(lastDate);
      setStartDate(lastDate);
      setEndDate(lastDate);
    }
  }, [availableDates, hazardLayerId]);

  useEffect(() => {
    if (hazardLayerId) {
      const newHazardGeometryType =
        (LayerDefinitions[hazardLayerId] as any).geometry || 'raster';
      if (newHazardGeometryType !== hazardGeometryType) {
        setHazardGeometryType(newHazardGeometryType);
      }
    } else if (hazardGeometryType !== null) {
      setHazardGeometryType(null);
    }
  }, [hazardGeometryType, hazardLayerId]);
  console.log({ hazardGeometryType });

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

  const analysisTypeOptions = [
    ['Generate admin level statistics', 'ADMIN'],
    ['Calculate Area Exposed', 'AREA'],
    ['Threshold Exceedence', 'THRESHOLD'],
  ].map(([key, value]) => (
    <FormControlLabel
      key={key}
      value={value}
      control={
        <Radio className={classes.radioOptions} color="default" size="small" />
      }
      label={key}
    />
  ));

  const activateUniqueBoundary = () => {
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

      safeDispatchAddLayer(map, boundaryLayer, dispatch);
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
    deactivateUniqueBoundary();

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

    if (!hazardLayerId) {
      throw new Error('Hazard layer should be selected to run analysis');
    }

    const selectedHazardLayer = LayerDefinitions[
      hazardLayerId
    ] as WMSLayerProps;

    if (hazardGeometryType === 'polygon') {
      if (!startDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!endDate) {
        throw new Error('Date Range must be given to run analysis');
      }

      const params: PolygonAnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        adminLevel: Number(adminLevel),
        startDate,
        endDate,
        extent,
      };

      await dispatch(requestAndStorePolygonAnalysis(params));
    } else {
      if (!hazardLayerId || !baselineLayerId) {
        throw new Error('Layer should be selected to run analysis');
      }

      const selectedBaselineLayer = LayerDefinitions[
        baselineLayerId
      ] as AdminLevelDataLayerProps;

      activateUniqueBoundary();

      if (!selectedDate) {
        throw new Error('Date must be given to run analysis');
      }

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

      await dispatch(requestAndStoreAnalysis(params));
    }
  };

  console.log({ analysisType, hazardLayerId });

  console.log(availableDates);

  const availableHazardLayerDates = hazardLayerId
    ? availableDates[
        (LayerDefinitions[hazardLayerId] as WMSLayerProps).serverLayerName
      ]?.map(d => new Date(d)) || []
    : [];
  console.log('availableHazardLayerDates:', availableHazardLayerDates);

  console.log('isAnalysisLoading:', isAnalysisLoading);
  console.log('analysisResult:', analysisResult);

  let tableRows;
  if (analysisResult instanceof PolygonAnalysisResult) {
    tableRows = analysisResult.tableData.rows;
  } else if (analysisResult instanceof BaselineLayerResult) {
    tableRows = analysisResult.tableData;
  }
  console.log({ isAnalyserFormOpen, tableRows });

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
          Run Analysis
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
              {hazardLayerId && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Geometry Type</Typography>
                  <p>{hazardGeometryType}</p>
                </div>
              )}

              <div className={classes.analyserOptions}>
                <Typography variant="body2">Hazard Layer</Typography>
                <LayerDropdown
                  type="wms"
                  // types={["wfs", "wms"]}
                  value={hazardLayerId}
                  setValue={setHazardLayerId}
                  className={classes.selector}
                  placeholder="Choose hazard layer"
                />
              </div>

              {hazardLayerId && hazardGeometryType === undefined && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Type of Analysis</Typography>
                  <FormControl component="div">
                    <RadioGroup
                      name="analysisType"
                      value={analysisType}
                      onChange={onOptionChange(setAnalysisType)}
                      row
                    >
                      {analysisTypeOptions}
                    </RadioGroup>
                  </FormControl>
                </div>
              )}

              {analysisType === 'ADMIN' && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Admin Level</Typography>
                  <AdminLevelDropdown
                    value={adminLevel}
                    onChange={setAdminLevel}
                  />
                </div>
              )}

              {analysisType !== 'ADMIN' && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Baseline Layer</Typography>
                  <LayerDropdown
                    type="admin_level_data"
                    // types={["admin_level_data"]}
                    value={baselineLayerId}
                    setValue={setBaselineLayerId}
                    className={classes.selector}
                    placeholder="Choose baseline layer"
                  />
                </div>
              )}

              {analysisType !== 'ADMIN' && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Threshold</Typography>
                  <TextField
                    id="filled-number"
                    error={!!thresholdError}
                    helperText={thresholdError}
                    className={classes.numberField}
                    label="Below"
                    type="number"
                    value={belowThreshold}
                    onChange={onThresholdOptionChange('below')}
                    variant="filled"
                  />
                  <TextField
                    id="filled-number"
                    label="Above"
                    className={classes.numberField}
                    value={aboveThreshold}
                    onChange={onThresholdOptionChange('above')}
                    type="number"
                    variant="filled"
                  />
                </div>
              )}

              {displayDateRange && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Date Range</Typography>
                  <div>
                    <Typography variant="body2">Start Date</Typography>
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
                      includeDates={availableHazardLayerDates}
                    />
                  </div>
                  <div>
                    <Typography variant="body2">End Date</Typography>
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
                      includeDates={availableHazardLayerDates}
                    />
                  </div>
                </div>
              )}

              {!displayDateRange && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Date</Typography>
                  <DatePicker
                    selected={selectedDate ? new Date(selectedDate) : null}
                    onChange={date =>
                      setSelectedDate(date?.getTime() || selectedDate)
                    }
                    maxDate={new Date()}
                    todayButton="Today"
                    peekNextMonth
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    customInput={<Input />}
                    popperClassName={classes.calendarPopper}
                    includeDates={availableHazardLayerDates}
                  />
                </div>
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
                      label="Map View"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          color="default"
                          checked={isTableViewOpen}
                          onChange={e => setIsTableViewOpen(e.target.checked)}
                        />
                      }
                      label="Table View"
                    />
                  </FormGroup>
                  {isTableViewOpen && (
                    <AnalysisTable
                      tableData={tableRows}
                      columns={getAnalysisTableColumns(analysisResult)}
                    />
                  )}
                  <Button
                    className={classes.innerAnalysisButton}
                    onClick={() =>
                      analysisResult instanceof BaselineLayerResult &&
                      downloadCSVFromTableData(analysisResult)
                    }
                  >
                    <Typography variant="body2">Download</Typography>
                  </Button>
                  <Button
                    className={classes.innerAnalysisButton}
                    onClick={clearAnalysis}
                  >
                    <Typography variant="body2">Clear Analysis</Typography>
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
                  !selectedDate || // or date hasn't been selected
                  !hazardLayerId || // or hazard layer hasn't been selected
                  (analysisType !== 'ADMIN' && !baselineLayerId) || // or baseline layer hasn't been selected
                  isAnalysisLoading // or analysis is currently loading
                }
              >
                <Typography variant="body2">Run Analysis</Typography>
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
      paddingLeft: '10px',
      marginTop: '10px',
      width: '85.5px',
      '& .Mui-focused': { color: 'white' },
    },
    calendarPopper: {
      zIndex: 3,
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {
  extent?: Extent;
}

export default withStyles(styles)(Analyser);
