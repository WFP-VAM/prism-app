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
  ListSubheader,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';

import {
  faBell,
  faCaretDown,
  faChartBar,
} from '@fortawesome/free-solid-svg-icons';
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

function AlertForm({ classes }: AlertFormProps) {
  const dispatch = useDispatch();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);

  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);
  const isMapLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const [isAlertFormFormOpen, setIsAlertFormFormOpen] = useState(false);
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

  const adminNames: string[] = useMemo(() => {
    if (!boundaryLayerData) {
      // Not loaded yet. Will proceed when it is.
      return [];
    }

    // Sorting in-place is fine here since it's a new array anyway
    // eslint-disable-next-line fp/no-mutating-methods
    return [
      ...boundaryLayerData.data.features.map(f => {
        if (!f.properties) {
          return '';
        }
        return `${f.properties.ADM1_EN} / ${f.properties.ADM2_EN}`;
      }),
    ]
      .filter(name => name !== '')
      .sort();
  }, [boundaryLayerData]);

  const runAlertForm = async () => {
    console.log('Click!');

    // if (!adminBoundariesExtent) {
    //   return;
    // } // hasn't been calculated yet

    // if (!selectedDate) {
    //   throw new Error('Date must be given to run analysis');
    // }

    // if (!hazardLayerId || !baselineLayerId) {
    //   throw new Error('Layer should be selected to run analysis');
    // }

    // const selectedHazardLayer = LayerDefinitions[
    //   hazardLayerId
    // ] as WMSLayerProps;
    // const selectedBaselineLayer = LayerDefinitions[
    //   baselineLayerId
    // ] as NSOLayerProps;

    // const params: AnalysisDispatchParams = {
    //   hazardLayer: selectedHazardLayer,
    //   baselineLayer: selectedBaselineLayer,
    //   date: selectedDate,
    //   statistic,
    //   extent: adminBoundariesExtent,
    //   threshold: {
    //     above: parseFloat(aboveThreshold) || undefined,
    //     below: parseFloat(belowThreshold) || undefined,
    //   },
    // };

    // await dispatch(requestAndStoreAnalysis(params));
  };

  return (
    <div className={classes.AlertForm}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setIsAlertFormFormOpen(!isAlertFormFormOpen);
        }}
      >
        <FontAwesomeIcon
          style={{ marginRight: '10px', fontSize: '1.6em' }}
          icon={faBell}
        />
        <Typography variant="body2">Create Alert</Typography>
        <FontAwesomeIcon icon={faCaretDown} style={{ marginLeft: '10px' }} />
      </Button>

      <Box
        className={classes.AlertFormMenu}
        width={isAlertFormFormOpen ? 'min-content' : 0}
        padding={isAlertFormFormOpen ? '10px' : 0}
      >
        {isAlertFormFormOpen ? (
          <div>
            <div className={classes.newAlertFormContainer}>
              <div className={classes.AlertFormOptions}>
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
              <div className={classes.AlertFormOptions}>
                <Typography variant="body2">Statistic</Typography>
                <FormControl component="div">
                  <Select id="select-statistic" defaultValue="placeholder">
                    <MenuItem
                      style={{ color: 'black' }}
                      key="placeholder"
                      value="placeholder"
                      disabled
                    >
                      Choose a statistic
                    </MenuItem>
                    <MenuItem
                      style={{ color: 'black' }}
                      key="minbelow"
                      value="minbelow"
                    >
                      Minimum Below
                    </MenuItem>
                    <MenuItem
                      style={{ color: 'black' }}
                      key="maxabove"
                      value="maxabove"
                    >
                      Maximum Above
                    </MenuItem>
                  </Select>
                </FormControl>
              </div>
              <div className={classes.AlertFormOptions}>
                <TextField
                  id="threshold"
                  className="thresholdClass"
                  label="Threshold"
                  type="number"
                  variant="filled"
                />
              </div>
              <div className={classes.AlertFormOptions}>
                <Select
                  id="regionsList"
                  className="regionsListClass"
                  label="Regions to monitor"
                  type="text"
                  variant="filled"
                  defaultValue={['allRegions']}
                  multiple
                  style={{ maxWidth: '200px' }}
                >
                  [
                  <MenuItem
                    style={{ color: 'black' }}
                    key="allRegions"
                    value="allRegions"
                  >
                    All
                  </MenuItem>
                  <ListSubheader>Administrative Regions</ListSubheader>
                  ...
                  {adminNames.map(adminName => (
                    <MenuItem
                      style={{ color: 'black' }}
                      key={adminName}
                      value={adminName}
                    >
                      {adminName}
                    </MenuItem>
                  ))}
                  ]
                </Select>
              </div>
              <div className={classes.AlertFormOptions}>
                <TextField
                  id="email-address"
                  className="emailAddressClass"
                  label="Email Address"
                  type="text"
                  variant="filled"
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
                onClick={runAlertForm}
                disabled={
                  !!thresholdError || // if there is a threshold error
                  !selectedDate || // or date hasn't been selected
                  !hazardLayerId || // or hazard layer hasn't been selected
                  !baselineLayerId || // or baseline layer hasn't been selected
                  isAnalysisLoading // or analysis is currently loading
                }
              >
                <Typography variant="body2">Create Alert</Typography>
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
    AlertForm: {
      zIndex: theme.zIndex.drawer - 1, // position this below the Analysis drawer
      position: 'absolute',
      top: 40,
      left: 2,
      textAlign: 'left',
    },
    AlertFormMenu: {
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
    AlertFormButton: {
      height: '36px',
      'margin-left': '3px',
    },
    AlertFormOptions: {
      padding: '5px 0px',
    },
    newAlertFormContainer: {
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

interface AlertFormProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AlertForm);
