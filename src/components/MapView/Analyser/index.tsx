import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
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
import { useHistory } from 'react-router-dom';

import { faCaretDown, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useDispatch, useSelector } from 'react-redux';
import bbox from '@turf/bbox';

import DatePicker from 'react-datepicker';

import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import {
  AggregationOperations,
  BoundaryLayerProps,
  NSOLayerProps,
  WMSLayerProps,
  LayerKey,
} from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import { Extent } from '../Layers/raster-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import {
  AnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLayerActiveSelector,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  setIsMapLayerActive,
} from '../../../context/analysisResultStateSlice';
import AnalysisTable from './AnalysisTable';
import {
  getAnalysisTableColumns,
  downloadCSVFromTableData,
} from '../../../utils/analysis-utils';
import LayerDropdown from './LayerDropdown';

const boundaryLayer = getBoundaryLayerSingleton();

function Analyser({ classes }: AnalyserProps) {
  const dispatch = useDispatch();
  const history = useHistory();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

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

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    // eslint-disable-next-line no-debugger
    debugger;
    const dates = hazardLayerId
      ? availableDates[
          (LayerDefinitions[hazardLayerId] as WMSLayerProps)?.serverLayerName
        ]
      : null;
    if (Number(new URLSearchParams(history.location.search).get('date'))) {
      return;
    }
    if (!dates || dates.length === 0) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dates[dates.length - 1]);
    }
  }, [availableDates, hazardLayerId, history.location.search]);

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
    if (belowThresholdValue < aboveThresholdValue) {
      setThresholdError('Min threshold is larger than Max!');
    } else {
      setThresholdError(null);
    }
  };

  const adminBoundariesExtent = useMemo(() => {
    // eslint-disable-next-line no-debugger
    debugger;
    if (!boundaryLayerData) {
      // not loaded yet. Should be loaded in MapView
      return null;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const statisticOptions = Object.entries(AggregationOperations).map(stat => (
    <FormControlLabel
      key={stat[0]}
      value={stat[1]}
      control={
        <Radio className={classes.radioOptions} color="default" size="small" />
      }
      label={stat[0]}
    />
  ));

  const clearAnalysis = () => dispatch(clearAnalysisResult());

  const runAnalyser = async () => {
    if (!adminBoundariesExtent) {
      return;
    } // hasn't been calculated yet

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    if (!hazardLayerId || !baselineLayerId) {
      throw new Error('Layer should be selected to run analysis');
    }

    const selectedHazardLayer = LayerDefinitions[
      hazardLayerId
    ] as WMSLayerProps;
    const selectedBaselineLayer = LayerDefinitions[
      baselineLayerId
    ] as NSOLayerProps;

    const params: AnalysisDispatchParams = {
      hazardLayer: selectedHazardLayer,
      baselineLayer: selectedBaselineLayer,
      date: selectedDate,
      statistic,
      extent: adminBoundariesExtent,
      threshold: {
        above: parseFloat(aboveThreshold) || undefined,
        below: parseFloat(belowThreshold) || undefined,
      },
    };

    await dispatch(requestAndStoreAnalysis(params));
    // eslint-disable-next-line fp/no-mutating-methods
    history.push(
      `?hazardLayerId=${hazardLayerId}&baselineLayerId=${baselineLayerId}&date=${selectedDate}&statistic=${statistic}&extent=${adminBoundariesExtent}&aboveThreshold=${aboveThreshold}&belowThreshold=${belowThreshold}`,
    );
  };

  useEffect(() => {
    const queryString = history.location.search;
    const params = new URLSearchParams(queryString);
    const hazardLayerParamId: string = params.get('hazardLayerId') || '';
    const baselineLayerParamId: string = params.get('baselineLayerId') || '';
    const selectedParamDate: number = Number(params.get('date'));
    const statisticParam: string = params.get('statistic') || '';

    function isHazardLayerId(layer: string): layer is LayerKey {
      return typeof layer === 'string';
    }
    function isBaselineLAyerId(layer: string): layer is LayerKey {
      return typeof layer === 'string';
    }

    if (isHazardLayerId(hazardLayerParamId)) {
      setHazardLayerId(hazardLayerParamId);
    }
    if (isBaselineLAyerId(baselineLayerParamId)) {
      setBaselineLayerId(baselineLayerParamId);
    }

    // Mean is selected by default
    if (statisticParam === 'median') {
      setStatistic(AggregationOperations.Median);
    }

    setSelectedDate(selectedParamDate);

    // Avoid Running Analyser if boundary Layer data is Null
    if (
      boundaryLayerData &&
      hazardLayerId &&
      baselineLayerId &&
      statisticParam
    ) {
      runAnalyser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaryLayerData]);

  return (
    <div className={classes.analyser}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setIsAnalyserFormOpen(!isAnalyserFormOpen);
        }}
      >
        <FontAwesomeIcon
          style={{ marginRight: '10px', fontSize: '1.6em' }}
          icon={faChartBar}
        />
        <Typography variant="body2">Run Analysis</Typography>
        <FontAwesomeIcon icon={faCaretDown} style={{ marginLeft: '10px' }} />
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
                <Typography variant="body2">Hazard Layer</Typography>
                <LayerDropdown
                  type="wms"
                  value={hazardLayerId}
                  setValue={setHazardLayerId}
                  title="Hazard Layer"
                  className={classes.selector}
                  placeholder="Choose hazard layer"
                />
              </div>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Statistic</Typography>
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
                <Typography variant="body2">Baseline Layer</Typography>
                <LayerDropdown
                  type="nso"
                  value={baselineLayerId}
                  setValue={setBaselineLayerId}
                  title="Baseline Layer"
                  className={classes.selector}
                  placeholder="Choose baseline layer"
                />
              </div>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Threshold</Typography>
                <TextField
                  id="filled-number"
                  error={!!thresholdError}
                  helperText={thresholdError}
                  className={classes.numberField}
                  label="Min"
                  type="number"
                  value={aboveThreshold}
                  onChange={onThresholdOptionChange('above')}
                  variant="filled"
                />
                <TextField
                  id="filled-number"
                  label="Max"
                  className={classes.numberField}
                  value={belowThreshold}
                  onChange={onThresholdOptionChange('below')}
                  type="number"
                  variant="filled"
                />
              </div>
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
                  includeDates={
                    hazardLayerId
                      ? availableDates[
                          (LayerDefinitions[hazardLayerId] as WMSLayerProps)
                            .serverLayerName
                        ]?.map(d => new Date(d)) || []
                      : []
                  }
                />
              </div>
            </div>

            {!isAnalysisLoading && analysisResult && (
              <>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        color="default"
                        checked={isMapLayerActive}
                        onChange={e =>
                          dispatch(setIsMapLayerActive(e.target.checked))
                        }
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
                    tableData={analysisResult.tableData}
                    columns={getAnalysisTableColumns(analysisResult)}
                  />
                )}
                <Button
                  className={classes.innerAnalysisButton}
                  onClick={() => downloadCSVFromTableData(analysisResult)}
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
            {!analysisResult && (
              <Button
                className={classes.innerAnalysisButton}
                onClick={() => runAnalyser()}
                disabled={
                  !!thresholdError || // if there is a threshold error
                  !selectedDate || // or date hasn't been selected
                  !hazardLayerId || // or hazard layer hasn't been selected
                  !baselineLayerId || // or baseline layer hasn't been selected
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
      position: 'absolute',
      top: 2,
      left: 2,
      textAlign: 'left',
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

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
