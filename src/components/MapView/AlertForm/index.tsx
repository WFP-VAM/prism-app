import React, { useMemo, useState } from 'react';
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
import { faBell, faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector } from 'react-redux';
import { getBoundaryLayerSingleton } from '../../../config/utils';
import { BoundaryLayerProps, LayerKey } from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import LayerDropdown from '../Layers/LayerDropdown';

// Not fully RFC-compliant, but should filter out obviously-invalid emails.
const EMAIL_REGEX: RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// This should probably be determined on a case-by-case basis,
// depending on if the downstream API has the capability.
// For now it can be permanently enabled.
const ALERT_FORM_ENABLED = true;

enum Statistic {
  Maximum,
  Minimum,
  Median,
  Mean,
}

enum Comparator {
  '>',
  '>=',
  '<',
  '<=',
}

const boundaryLayer = getBoundaryLayerSingleton();

function AlertForm({ classes }: AlertFormProps) {
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const [isAlertFormFormOpen, setIsAlertFormFormOpen] = useState(false);

  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey>();
  const [regionsList, setRegionsList] = useState<string[]>(['allRegions']);
  const [emailValid, setEmailValid] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [selectedStat, setSelectedStat] = useState<Statistic>();
  const [selectedComparator, setSelectedComparator] = useState('');
  const [selectedThreshold, setSelectedThreshold] = useState<number>(0);

  const regionNamesToNsoCodes: { [k: string]: string } = useMemo(() => {
    if (!boundaryLayerData) {
      // Not loaded yet. Will proceed when it is.
      return {};
    }

    return Object.fromEntries(
      boundaryLayerData.data.features
        .filter(feature => feature.properties != null)
        .map(feature => [
          `${feature.properties?.ADM1_EN} / ${feature.properties?.ADM2_EN}`,
          feature.properties?.NSO_CODE,
        ]),
    );
  }, [boundaryLayerData]);

  const sortedRegionNames: string[] = useMemo(() => {
    // Fine to mutate this array since it's a new array of key names

    // eslint-disable-next-line fp/no-mutating-methods
    return Object.keys(regionNamesToNsoCodes).sort();
  }, [regionNamesToNsoCodes]);

  const onChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = event.target.value;
    setEmailValid(!!newEmail.match(EMAIL_REGEX));
    setEmail(newEmail);
  };

  const runAlertForm = async () => {
    const regionCodes = regionsList
      .filter(r => r !== 'allRegions')
      .map(r => regionNamesToNsoCodes[r]);

    const apiData = {
      hazardLayerId,
      statistic: selectedStat,
      comparator: selectedComparator,
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

  if (!ALERT_FORM_ENABLED) {
    return null;
  }

  return (
    <div className={classes.alertForm}>
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
        className={classes.alertFormMenu}
        width={isAlertFormFormOpen ? 'min-content' : 0}
        padding={isAlertFormFormOpen ? '10px' : 0}
      >
        {isAlertFormFormOpen ? (
          <div>
            <div className={classes.newAlertFormContainer}>
              <div className={classes.alertFormOptions}>
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
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">Statistic</Typography>
                <FormControl component="span">
                  <Select
                    id="select-statistic"
                    defaultValue="placeholder"
                    onChange={e => setSelectedStat(e.target.value as Statistic)}
                  >
                    [
                    <MenuItem key="placeholder" value="placeholder" disabled>
                      Statistic
                    </MenuItem>
                    ...
                    {Object.keys(Statistic)
                      .filter(n => Number.isNaN(Number(n)))
                      .map(stat => (
                        <MenuItem key={stat} value={stat}>
                          {stat}
                        </MenuItem>
                      ))}
                    ]
                  </Select>
                </FormControl>
                <FormControl component="span">
                  <Select
                    id="select-comparator"
                    className={classes.comparatorSelector}
                    defaultValue="placeholder"
                    onChange={e =>
                      setSelectedComparator(e.target.value as string)
                    }
                  >
                    [
                    <MenuItem key="placeholder" value="placeholder" disabled>
                      -
                    </MenuItem>
                    ...
                    {Object.keys(Comparator)
                      .filter(n => Number.isNaN(Number(n)))
                      .map(comp => (
                        <MenuItem key={comp} value={comp}>
                          {comp}
                        </MenuItem>
                      ))}
                    ]
                  </Select>
                </FormControl>
              </div>
              <div className={classes.alertFormOptions}>
                <TextField
                  id="threshold"
                  label="Threshold"
                  type="number"
                  variant="filled"
                  defaultValue={0}
                  onChange={e =>
                    setSelectedThreshold(parseInt(e.target.value, 10))
                  }
                />
              </div>
              <div className={classes.alertFormOptions}>
                <Select
                  id="regionsList"
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
                  <MenuItem key="allRegions" value="allRegions">
                    All
                  </MenuItem>
                  <ListSubheader>Administrative Regions</ListSubheader>
                  ...
                  {sortedRegionNames.map(region => {
                    return (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    );
                  })}
                  ]
                </Select>
              </div>
              <div className={classes.alertFormOptions}>
                <TextField
                  id="email-address"
                  label="Email Address"
                  type="text"
                  variant="filled"
                  onChange={onChangeEmail}
                />
              </div>
            </div>
            <Button
              className={classes.innerCreateAlertButton}
              onClick={runAlertForm}
              disabled={
                !hazardLayerId ||
                !selectedStat ||
                !selectedComparator ||
                !emailValid
              }
            >
              <Typography variant="body2">Create Alert</Typography>
            </Button>
          </div>
        ) : null}
      </Box>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    alertForm: {
      zIndex: theme.zIndex.drawer,
      textAlign: 'left',
      marginTop: '5px',
    },
    alertFormMenu: {
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
    alertFormButton: {
      height: '36px',
      marginLeft: '3px',
    },
    alertFormOptions: {
      padding: '5px 0px',
    },
    newAlertFormContainer: {
      padding: '5px',
      marginTop: '10px',
    },
    innerCreateAlertButton: {
      backgroundColor: '#3d474a',
      margin: '10px',
      '&:disabled': {
        opacity: '0.5',
      },
    },
    selector: {
      margin: '5px',
    },
    comparatorSelector: {
      textAlign: 'center',
    },
  });

interface AlertFormProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AlertForm);
