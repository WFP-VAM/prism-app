import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  createStyles,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { faBell, faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useDispatch, useSelector } from 'react-redux';

import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import {
  BoundaryLayerProps,
  WMSLayerProps,
  LayerKey,
} from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import LayerDropdown from '../Layers/LayerDropdown';

const boundaryLayer = getBoundaryLayerSingleton();

function AlertForm({ classes }: AlertFormProps) {
  const dispatch = useDispatch();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const availableDates = useSelector(availableDatesSelector);

  const [isAlertFormFormOpen, setIsAlertFormFormOpen] = useState(false);

  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey>();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [regionsList, setRegionsList] = useState<string[]>(['allRegions']);
  const [emailValid, setEmailValid] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [selectedThreshold, setSelectedThreshold] = useState<number>(0);

  // Very basic regex for detecting emails
  const emailRegex: RegExp = RegExp('.+@.+');

  // On by default, may want to disable it in some cases
  const isAlertFormEnabled = true;

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

  const regionNamesToNsoCodes: Map<string, string> = useMemo(() => {
    if (!boundaryLayerData) {
      // Not loaded yet. Will proceed when it is.
      return new Map();
    }

    return new Map(
      boundaryLayerData.data.features
        .filter(feature => feature.properties != null)
        .map(feature => [
          `${feature.properties?.ADM1_EN} / ${feature.properties?.ADM2_EN}`,
          feature.properties?.NSO_CODE,
        ]),
    );
  }, [boundaryLayerData]);

  const regionNames: string[] = useMemo(() => {
    if (!boundaryLayerData) {
      // Not loaded yet. Will proceed when it is.
      return [];
    }

    return (
      // eslint-disable-next-line fp/no-mutating-methods
      boundaryLayerData.data.features
        .filter(feature => feature.properties != null)
        .map(
          feature =>
            `${feature.properties?.ADM1_EN} / ${feature.properties?.ADM2_EN}`,
        )
        // We can mutate the array since it's a new one anyway
        .sort()
    );
  }, [boundaryLayerData]);

  const onChangeEmail = (event: { target: { value: string } }) => {
    const newEmail = event.target.value as string;
    setEmailValid(!!newEmail.match(emailRegex));
    setEmail(newEmail);
  };

  const runAlertForm = async () => {
    const regionCodes = regionsList
      .filter(r => r !== 'allRegions')
      .map(r => regionNamesToNsoCodes.get(r));

    const apiData = {
      hazardLayerId,
      statistic: selectedStat,
      threshold: selectedThreshold,
      regionNsoCodes: regionCodes,
      email,
      zones_url: '', // part of the ApiData object; refactor needed
      geotiff_url: '', // ^
    };

    console.log(apiData);

    // TODO: Make API call
    // await fetchApiData('http://localhost:80/alarms', apiData);
  };

  return isAlertFormEnabled ? (
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
                  <Select
                    id="select-statistic"
                    defaultValue="placeholder"
                    onChange={e => setSelectedStat(e.target.value as string)}
                  >
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
                  defaultValue={0}
                  onChange={e =>
                    setSelectedThreshold(parseInt(e.target.value, 10))
                  }
                />
              </div>
              <div className={classes.AlertFormOptions}>
                <Select
                  id="regionsList"
                  className="regionsListClass"
                  label="Regions to monitor"
                  type="text"
                  variant="filled"
                  value={regionsList}
                  multiple
                  style={{ maxWidth: '200px' }}
                  onChange={e => {
                    const selected: string[] = e.target.value as string[];
                    const lastSelected = selected[selected.length - 1];

                    if (lastSelected !== 'allRegions') {
                      setRegionsList(
                        selected.filter(el => el !== 'allRegions'),
                      );
                    } else {
                      // If 'allRegions' was the last selected then it should be the only thing selected.
                      setRegionsList(['allRegions']);
                    }
                  }}
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
                  {regionNames.map(region => {
                    return (
                      <MenuItem
                        style={{ color: 'black' }}
                        key={region}
                        value={region}
                      >
                        {region}
                      </MenuItem>
                    );
                  })}
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
                  onChange={onChangeEmail}
                />
              </div>
            </div>
            <Button
              className={classes.innerAnalysisButton}
              onClick={runAlertForm}
              disabled={!hazardLayerId || !selectedStat || !emailValid}
            >
              <Typography variant="body2">Create Alert</Typography>
            </Button>
          </div>
        ) : null}
      </Box>
    </div>
  ) : null;
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
