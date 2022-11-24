import {
  Box,
  Button,
  createStyles,
  TextField,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { ArrowDropDown, Notifications } from '@material-ui/icons';
import React, { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BoundaryLayerProps,
  LayerKey,
  WMSLayerProps,
} from '../../../config/types';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import {
  AlertRequest,
  fetchApiData,
  getPrismUrl,
} from '../../../utils/analysis-utils';
import LayerDropdown from '../Layers/LayerDropdown';
import BoundaryDropdown from '../Layers/BoundaryDropdown';
import { getSelectedBoundaries } from '../../../context/mapSelectionLayerStateSlice';
import { addNotification } from '../../../context/notificationStateSlice';
import { useSafeTranslation } from '../../../i18n';

// Not fully RFC-compliant, but should filter out obviously-invalid emails.
// Source: https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
const EMAIL_REGEX: RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// This should probably be determined on a case-by-case basis,
// depending on if the downstream API has the capability.
// For now it can be permanently enabled.
const ALERT_FORM_ENABLED = true;

// TODO: Dynamic switch between local/production URLs, and consolidate this into util class
const ALERT_API_URL = 'https://prism-api.ovio.org/alerts';
// const ALERT_API_URL = 'http://localhost:80/alerts';

const boundaryLayer = getBoundaryLayerSingleton();

function AlertForm({ classes, isOpen, setOpen }: AlertFormProps) {
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const regionsList = useSelector(getSelectedBoundaries);
  const dispatch = useDispatch();
  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey>();
  const [emailValid, setEmailValid] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [belowThreshold, setBelowThreshold] = useState('');
  const [aboveThreshold, setAboveThreshold] = useState('');
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [alertName, setAlertName] = useState('');
  const [alertWaiting, setAlertWaiting] = useState(false);

  const { t } = useSafeTranslation();
  const regionCodesToFeatureData: { [k: string]: object } = useMemo(() => {
    if (!boundaryLayerData) {
      // Not loaded yet. Will proceed when it is.
      return {};
    }

    return Object.fromEntries(
      boundaryLayerData.data.features
        .filter(feature => feature.properties !== null)
        .map(feature => {
          return [feature.properties?.[boundaryLayer.adminCode], feature];
        }),
    );
  }, [boundaryLayerData]);

  const generateGeoJsonForRegionNames = () => {
    // TODO - Handle these errors properly.
    if (!boundaryLayerData) {
      throw new Error('Boundary layer data is not loaded yet.');
    }

    if (regionsList.length === 0) {
      throw new Error('Please select at least one region boundary.');
    }

    const features = regionsList.map(region => {
      return regionCodesToFeatureData[region];
    });

    // Generate a copy of admin layer data (to preserve top-level properties)
    // and replace the 'features' property with just the selected regions.
    const mutableFeatureCollection = JSON.parse(
      JSON.stringify(boundaryLayerData.data),
    );
    // eslint-disable-next-line fp/no-mutation
    mutableFeatureCollection.features = features;

    return mutableFeatureCollection;
  };

  const onChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = event.target.value;
    setEmailValid(!!newEmail.match(EMAIL_REGEX));
    setEmail(newEmail);
  };

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
    // setting a value doesn't update the existing value until next render,
    // therefore we must decide whether to access the old one or the newly change one here.
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

  const runAlertForm = async () => {
    if (!hazardLayerId) {
      throw new Error('Layer should be selected to create alert.');
    }

    const request: AlertRequest = {
      alert_name: alertName,
      alert_config: LayerDefinitions[hazardLayerId] as WMSLayerProps,
      max: parseFloat(aboveThreshold) || undefined,
      min: parseFloat(belowThreshold) || undefined,
      zones: generateGeoJsonForRegionNames(),
      email,
      prism_url: getPrismUrl(),
    };

    setAlertWaiting(true);
    const response = await fetchApiData(ALERT_API_URL, request);
    setAlertWaiting(false);

    if ('message' in response) {
      // TODO response isn't typed correctly because fetchApiData is too strict.
      dispatch(
        addNotification({
          message: (response as { message: string }).message,
          type: 'success',
        }),
      );
    }
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
          setOpen(!isOpen);
        }}
      >
        <Notifications fontSize="small" />
        <Typography variant="body2" className={classes.alertLabel}>
          {t('Create Alert')}
        </Typography>
        <ArrowDropDown fontSize="small" />
      </Button>

      <Box
        className={classes.alertFormMenu}
        width={isOpen ? 'min-content' : 0}
        padding={isOpen ? '10px' : 0}
      >
        {isOpen ? (
          <div>
            <div className={classes.newAlertFormContainer}>
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">{t('Hazard Layer')}</Typography>
                <LayerDropdown
                  type="wms"
                  value={hazardLayerId}
                  setValue={setHazardLayerId}
                  className={classes.selector}
                  placeholder="Choose hazard layer"
                />
              </div>
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">{t('Threshold')}</Typography>
                <TextField
                  id="filled-number"
                  error={!!thresholdError}
                  helperText={t(thresholdError || '')}
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
                  style={{ paddingLeft: '10px' }}
                  value={aboveThreshold}
                  onChange={onThresholdOptionChange('above')}
                  type="number"
                  variant="filled"
                />
              </div>
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">{t('Regions')}</Typography>
                <BoundaryDropdown className={classes.regionSelector} />
              </div>
              <div className={classes.alertFormOptions}>
                <TextField
                  id="alert-name"
                  label={t('Alert Name')}
                  type="text"
                  variant="filled"
                  value={alertName}
                  onChange={e => setAlertName(e.target.value)}
                  fullWidth
                />
              </div>
              <div className={classes.alertFormOptions}>
                <TextField
                  id="email-address"
                  label={t('Email Address')}
                  type="text"
                  variant="filled"
                  onChange={onChangeEmail}
                  fullWidth
                />
              </div>
            </div>
            <Button
              className={classes.innerCreateAlertButton}
              onClick={runAlertForm}
              disabled={
                !hazardLayerId ||
                !!thresholdError ||
                !emailValid ||
                alertWaiting ||
                regionsList.length === 0
              }
            >
              <Typography variant="body2">{t('Create Alert')}</Typography>
            </Button>
          </div>
        ) : null}
      </Box>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    alertLabel: { marginLeft: '10px' },
    alertForm: {
      zIndex: theme.zIndex.drawer,
      textAlign: 'left',
      marginTop: '5px',
    },
    alertFormMenu: {
      backgroundColor: theme.surfaces?.light,
      maxWidth: '100vw',
      minWidth: 'max-content',
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
      backgroundColor: theme.surfaces?.dark,
      margin: '10px',
      '&:disabled': {
        opacity: '0.5',
      },
    },
    selector: {
      margin: '5px',
    },
    regionSelector: {
      minWidth: '100%',
      maxWidth: '200px',
    },
    numberField: {
      marginTop: '10px',
      width: '110px',
      '&:focused': { color: 'white' },
    },
    alertFormResponseText: {
      marginLeft: '15px',
    },
  });

interface AlertFormProps extends WithStyles<typeof styles> {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

export default withStyles(styles)(AlertForm);
