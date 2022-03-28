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
  Divider,
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
  AdminLevelType,
  AggregationOperations,
  AdminLevelDataLayerProps,
  BasicDataType,
  DisplayStatsEnum,
  OperatorEnum,
  WMSLayerProps,
  LayerKey,
  BoundaryLayerProps,
  RasterAnalysisEnum,
} from '../../../config/types';

import { Extent } from '../Layers/raster-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import {
  AdminStatsDispatchParams,
  AnalysisDispatchParams,
  PolygonAnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLayerActiveSelector,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  requestAndStorePolygonAnalysis,
  setIsMapLayerActive,
  requestAndStoreAdminStats,
} from '../../../context/analysisResultStateSlice';
import AnalysisTable from './AnalysisTable';
import {
  getAnalysisTableColumns,
  downloadCSVFromTableData,
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
  AdminStatsResult,
} from '../../../utils/analysis-utils';
import AdminLevelDropdown from '../Layers/AdminLevelDropdown';
import LayerDropdown from '../Layers/LayerDropdown';
import SimpleDropdown from '../SimpleDropdown';
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
import { IconPoint, IconPolygon, IconRaster } from '../Icons';

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
  const [rasterAnalysisType, setRasterAnalysisType] = useState<
    RasterAnalysisEnum
  >(RasterAnalysisEnum.Admin);
  const [adminLevel, setAdminLevel] = useState<AdminLevelType>(1);
  const [hazardDataType, setHazardDataType] = useState<BasicDataType | null>(
    null,
  );
  const [statistic, setStatistic] = useState(AggregationOperations.Mean);
  const [displayStatistic, setDisplayStatistic] = useState(
    DisplayStatsEnum.Mean,
  );
  const [baselineLayerId, setBaselineLayerId] = useState<LayerKey>();
  const [operator, setOperator] = useState<OperatorType>();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  const [exposureOperator, setExposureOperator] = useState<OperatorEnum>(
    OperatorEnum.eq,
  );

  const [belowThreshold, setBelowThreshold] = useState('');
  const [aboveThreshold, setAboveThreshold] = useState('');
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const displayDate = hazardLayerId && hazardDataType === BasicDataType.Raster;
  // display data range if hazard data is vector based
  const displayDateRange =
    (hazardLayerId && hazardDataType === BasicDataType.Point) ||
    hazardDataType === BasicDataType.LineString ||
    hazardDataType === BasicDataType.Polygon;

  // display admin level dropdown
  const displayAdminLevelDropdown =
    hazardLayerId &&
    ((hazardDataType === BasicDataType.Raster &&
      rasterAnalysisType === RasterAnalysisEnum.Admin) ||
      hazardDataType === BasicDataType.Polygon);

  const displayDownloadTableButton =
    analysisResult instanceof BaselineLayerResult ||
    analysisResult instanceof PolygonAnalysisResult ||
    analysisResult instanceof AdminStatsResult;

  const BASELINE_URL_LAYER_KEY = 'baselineLayerId';
  const preSelectedBaselineLayer = selectedLayers.find(
    l => l.type === 'admin_level_data',
  );
  const [previousBaselineId, setPreviousBaselineId] = useState<
    LayerKey | undefined
  >(preSelectedBaselineLayer?.id);

  function AnalysisTypeSubHeading() {
    const height = 20;
    if (hazardDataType === BasicDataType.Point) {
      return (
        <>
          <IconPoint style={{ height, marginRight: 10 }} />
          Point data analysis
        </>
      );
    }

    if (hazardDataType === BasicDataType.Polygon) {
      return (
        <>
          <IconPolygon style={{ height, marginRight: 10 }} />
          Polygon analysis
        </>
      );
    }

    if (hazardDataType === BasicDataType.Raster) {
      return (
        <>
          <IconRaster style={{ height, marginRight: 10 }} />
          Raster analysis
        </>
      );
    }

    // return placeholder
    return (
      <>
        <img src="" alt="" style={{ height: 30 }} />
        &nbsp;
      </>
    );
  }

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
      const newHazardDataType =
        (LayerDefinitions[hazardLayerId] as any).geometry || 'raster';
      if (newHazardDataType !== hazardDataType) {
        setHazardDataType(newHazardDataType);
      }
    } else if (hazardDataType !== null) {
      setHazardDataType(null);
    }
  }, [hazardDataType, hazardLayerId]);
  console.log({ hazardDataType });

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

  const rasterAnalysisTypeOptions = [
    [RasterAnalysisEnum.Admin, 'Generate admin level statistics'],
    [RasterAnalysisEnum.Exposed, 'Calculate area exposed'],
    [RasterAnalysisEnum.Threshold, 'Threshold exceedence'],
  ].map(([key, label]) => (
    <FormControlLabel
      key={key}
      value={key}
      control={
        <Radio className={classes.radioOptions} color="default" size="small" />
      }
      label={label}
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
      return;
      // throw new Error('Layer should be selected to run analysis');
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

    if (hazardDataType === BasicDataType.Polygon) {
      if (!startDate) {
        throw new Error('Date Range must be given to run analysis');
      }
      if (!endDate) {
        throw new Error('Date Range must be given to run analysis');
      }

      const params: PolygonAnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        adminLevel,
        startDate,
        endDate,
        extent,
      };

      await dispatch(requestAndStorePolygonAnalysis(params));
    } else if (
      hazardDataType === BasicDataType.Raster ||
      rasterAnalysisType === RasterAnalysisEnum.Admin
    ) {
      console.log('running raster admin analysis stats');

      if (!hazardLayerId) {
        throw new Error('Hazard layer must be selected to run analysis');
      }

      if (!selectedDate) {
        throw new Error('Date must be given to run analysis');
      }

      const params: AdminStatsDispatchParams = {
        adminLevel,
        date: selectedDate,
        extent,
        hazardLayer: selectedHazardLayer,
        statistic: displayStatistic,
      };
      console.log('params:', params);

      await dispatch(requestAndStoreAdminStats(params));
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

  console.log({ setRasterAnalysisType, hazardLayerId });

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
    tableRows = analysisResult.tableData;
  } else if (analysisResult instanceof BaselineLayerResult) {
    tableRows = analysisResult.tableData;
  } else if (analysisResult instanceof ExposedPopulationResult) {
    // pass
  } else if (analysisResult instanceof AdminStatsResult) {
    tableRows = analysisResult.tableData;
  }
  console.log({ isAnalyserFormOpen, tableRows });

  // const displayBaselineLayerDropdown = hazardDataType === BasicDataType.Raster && (rasterAnalysisType === RasterAnalysisEnum.Exposed || rasterAnalysisType === RasterAnalysisEnum.Threshold);
  const displayBaselineLayerDropdown = false;

  const displayExposureValue =
    hazardLayerId &&
    hazardDataType === BasicDataType.Raster &&
    rasterAnalysisType === RasterAnalysisEnum.Exposed;

  const displayThresholdOption =
    hazardDataType === BasicDataType.Raster &&
    (rasterAnalysisType === RasterAnalysisEnum.Exposed ||
      rasterAnalysisType === RasterAnalysisEnum.Threshold);

  const displayRasterAnalysisType = hazardDataType === BasicDataType.Raster;
  const displayRunAnalysisButton = hazardLayerId && !analysisResult;
  // const displayAggOpsDropdown = hazardDataType === BasicDataType.Raster && rasterAnalysisType === RasterAnalysisEnum.Exposed;
  const displayAggOpsDropdown = false;
  const displayStatDropdown =
    hazardDataType === BasicDataType.Raster &&
    rasterAnalysisType === RasterAnalysisEnum.Admin;
  const displayOperatorDropdown =
    (hazardDataType === BasicDataType.Raster &&
      (rasterAnalysisType === RasterAnalysisEnum.Exposed ||
        rasterAnalysisType === RasterAnalysisEnum.Threshold)) ||
    hazardDataType === BasicDataType.Polygon ||
    hazardDataType === BasicDataType.Point;

  console.log({ displayStatDropdown, rasterAnalysisType });

  const disableRunAnalysisButton =
    !!thresholdError || // if there is a threshold error
    !selectedDate || // or date hasn't been selected
    !hazardLayerId || // or hazard layer hasn't been selected
    (rasterAnalysisType !== RasterAnalysisEnum.Admin && !baselineLayerId) || // or baseline layer hasn't been selected (don't need baseline layer if doing admin stats)
    isAnalysisLoading; // or analysis is currently loading

  console.log({
    thresholdError,
    selectedDate,
    hazardLayerId,
    baselineLayerId,
    isAnalysisLoading,
  });

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
              <div className={classes.analyserOptions}>
                <AnalysisTypeSubHeading />
              </div>
              <Divider variant="middle" />

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

              {displayRasterAnalysisType && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Type of Analysis</Typography>
                  <FormControl component="div">
                    <RadioGroup
                      name="rasterAnalysisType"
                      value={rasterAnalysisType}
                      onChange={onOptionChange(setRasterAnalysisType)}
                      row
                    >
                      {rasterAnalysisTypeOptions}
                    </RadioGroup>
                  </FormControl>
                </div>
              )}

              {displayAggOpsDropdown && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Statistic</Typography>
                  <SimpleDropdown
                    options={Object.entries(AggregationOperations)}
                    value={statistic}
                    onChange={setStatistic}
                  />
                </div>
              )}

              {displayStatDropdown && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Display Statistic</Typography>
                  <SimpleDropdown
                    options={Object.entries(DisplayStatsEnum)}
                    value={displayStatistic}
                    onChange={setDisplayStatistic}
                  />
                </div>
              )}

              {displayAdminLevelDropdown && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Admin Level</Typography>
                  <AdminLevelDropdown
                    value={adminLevel}
                    onChange={setAdminLevel}
                  />
                </div>
              )}

              {displayExposureValue && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Exposure Value</Typography>
                  <Typography variant="body2">Threshold</Typography>
                  <SimpleDropdown
                    options={Object.entries(OperatorEnum)}
                    value={exposureOperator}
                    onChange={setExposureOperator}
                  />
                </div>
              )}

              {displayBaselineLayerDropdown && (
                <div className={classes.analyserOptions}>
                  <Typography variant="body2">Baseline Layer</Typography>
                  <LayerDropdown
                    type="admin_level_data"
                    value={baselineLayerId}
                    setValue={setBaselineLayerId}
                    className={classes.selector}
                    placeholder="Choose baseline layer"
                  />
                </div>
              )}

              {displayThresholdOption && (
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
                      selected={endDate ? new Date(endDate) : null}
                      onChange={date => setEndDate(date?.getTime() || endDate)}
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

              {displayDate && (
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
                analysisResult instanceof PolygonAnalysisResult ||
                analysisResult instanceof AdminStatsResult) && (
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
                  {displayDownloadTableButton && (
                    <Button
                      className={classes.innerAnalysisButton}
                      onClick={() => downloadCSVFromTableData(analysisResult)}
                    >
                      <Typography variant="body2">Download</Typography>
                    </Button>
                  )}
                  <Button
                    className={classes.innerAnalysisButton}
                    onClick={clearAnalysis}
                  >
                    <Typography variant="body2">Clear Analysis</Typography>
                  </Button>
                </>
              )}

            {displayRunAnalysisButton && (
              <Button
                className={classes.innerAnalysisButton}
                onClick={runAnalyser}
                disabled={disableRunAnalysisButton}
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
      maxHeight: '80vh',
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
