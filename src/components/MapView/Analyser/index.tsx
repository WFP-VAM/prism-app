import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
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
import { layerDataSelector } from '../../../context/mapStateSlice';
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
import LayerDropdown from '../../../utils/LayerDropdown';

const boundaryLayer = getBoundaryLayerSingleton();

function Analyser({ classes }: AnalyserProps) {
  const dispatch = useDispatch();
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

  // enforce errors
  useEffect(() => {
    const belowThresholdValue = parseFloat(belowThreshold);
    const aboveThresholdValue = parseFloat(aboveThreshold);
    if (belowThresholdValue > aboveThresholdValue) {
      setThresholdError('Min threshold is larger than Max!');
    } else {
      setThresholdError(null);
    }
  }, [belowThreshold, aboveThreshold]);

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    const dates = hazardLayerId
      ? availableDates[
          (LayerDefinitions[hazardLayerId] as WMSLayerProps)?.serverLayerName
        ]
      : null;
    if (!dates || dates.length === 0) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dates[dates.length - 1]);
    }
  }, [availableDates, hazardLayerId]);

  const onOptionChange = <T extends string>(
    setterFunc: Dispatch<SetStateAction<T>>,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setterFunc(event.target.value as T);
  };

  const adminBoundariesExtent = useMemo(() => {
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

  const runAnalyser = async () => {
    if (!adminBoundariesExtent) {
      return;
    } // hasn't been calculated yet
    if (analysisResult) {
      // if one exists we are likely trying to clear it to do a new one
      dispatch(clearAnalysisResult());
      return;
    }
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
        <FontAwesomeIcon
          style={{ marginRight: '10px', fontSize: '1.6em' }}
          icon={faChartBar}
        />
        <Typography variant="body2">Run Analysis</Typography>
        <FontAwesomeIcon icon={faCaretDown} style={{ marginLeft: '10px' }} />
      </Button>

      <div
        className={classes.analyserMenu}
        style={{
          width: isAnalyserFormOpen ? 'min-content' : 0,
          padding: isAnalyserFormOpen ? 10 : 0,
        }}
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
                  value={belowThreshold}
                  onChange={onOptionChange(setBelowThreshold)}
                  variant="filled"
                />
                <TextField
                  id="filled-number"
                  label="Max"
                  className={classes.numberField}
                  value={aboveThreshold}
                  onChange={onOptionChange(setAboveThreshold)}
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
                  <AnalysisTable analysisResult={analysisResult} />
                )}
              </>
            )}
            <Button
              className={classes.innerAnalysisButton}
              onClick={runAnalyser}
              disabled={
                (!analysisResult && (!!thresholdError || !selectedDate)) ||
                !hazardLayerId ||
                !baselineLayerId
              }
            >
              <Typography variant="body2">
                {analysisResult ? 'Clear Analysis' : 'Run Analysis'}
              </Typography>
            </Button>
            {isAnalysisLoading ? <LinearProgress /> : null}
          </div>
        ) : null}
      </div>
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
      // transition: 'width 0.5s ease-in-out',
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
      margin: '10px 0',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    selectorLabel: {
      '&.Mui-focused': { color: 'white' },
    },
    selector: {
      margin: '5px',
    },
    numberField: {
      padding: '10px',
      width: '85.5px',
      '& .Mui-focused': { color: 'white' },
    },
    calendarPopper: {
      zIndex: 3,
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
