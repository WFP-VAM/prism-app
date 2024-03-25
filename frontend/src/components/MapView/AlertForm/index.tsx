import {
  Box,
  Button,
  createStyles,
  Menu,
  TextField,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { ArrowDropDown, Notifications } from '@material-ui/icons';
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BoundaryLayerProps, LayerKey, WMSLayerProps } from 'config/types';
import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import { LayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { AlertRequest, fetchApiData, getPrismUrl } from 'utils/analysis-utils';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import BoundaryDropdown from 'components/MapView/Layers/BoundaryDropdown';
import { getSelectedBoundaries } from 'context/mapSelectionLayerStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { useSafeTranslation } from 'i18n';
import { ALERT_API_URL } from 'utils/constants';

// Not fully RFC-compliant, but should filter out obviously-invalid emails.
// Source: https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
const EMAIL_REGEX: RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// This should probably be determined on a case-by-case basis,
// depending on if the downstream API has the capability.
// For now it can be permanently enabled.
const ALERT_FORM_ENABLED = true;

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
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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

  const generateGeoJsonForRegionNames = useCallback(() => {
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
  }, [boundaryLayerData, regionCodesToFeatureData, regionsList]);

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
  const onThresholdOptionChange = useCallback(
    (thresholdType: 'above' | 'below') => (
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
    },
    [aboveThreshold, belowThreshold],
  );

  const runAlertForm = useCallback(async () => {
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
    const response = await fetchApiData(ALERT_API_URL, request, dispatch);
    setAlertWaiting(false);

    if ((response as unknown) === 'Success') {
      // TODO response isn't typed correctly because fetchApiData is too strict.
      dispatch(
        addNotification({
          message: 'Success',
          type: 'success',
        }),
      );
    }
  }, [
    aboveThreshold,
    alertName,
    belowThreshold,
    dispatch,
    email,
    generateGeoJsonForRegionNames,
    hazardLayerId,
  ]);

  const renderedAlertForm = useMemo(() => {
    if (!isOpen) {
      return null;
    }
    return (
      <Box className={classes.alertFormMenu}>
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
            <div className={classes.thresholdInputsContainer}>
              <TextField
                id="filled-number"
                error={!!thresholdError}
                helperText={t(thresholdError || '')}
                className={classes.numberField}
                label={t('Below')}
                InputLabelProps={{
                  style: { color: '#ffffff' },
                }}
                type="number"
                value={belowThreshold}
                onChange={onThresholdOptionChange('below')}
                variant="filled"
              />
              <TextField
                id="filled-number"
                label={t('Above')}
                className={classes.numberField}
                InputLabelProps={{
                  style: { color: '#ffffff' },
                }}
                value={aboveThreshold}
                onChange={onThresholdOptionChange('above')}
                type="number"
                variant="filled"
              />
            </div>
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
              InputLabelProps={{
                style: { color: '#ffffff' },
              }}
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
              InputLabelProps={{
                style: { color: '#ffffff' },
              }}
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
      </Box>
    );
  }, [
    aboveThreshold,
    alertName,
    alertWaiting,
    belowThreshold,
    classes.alertFormMenu,
    classes.alertFormOptions,
    classes.innerCreateAlertButton,
    classes.newAlertFormContainer,
    classes.numberField,
    classes.regionSelector,
    classes.selector,
    classes.thresholdInputsContainer,
    emailValid,
    hazardLayerId,
    isOpen,
    onThresholdOptionChange,
    regionsList.length,
    runAlertForm,
    t,
    thresholdError,
  ]);

  if (!ALERT_FORM_ENABLED) {
    return null;
  }

  return (
    <div className={classes.alertForm}>
      <Button
        className={classes.alertTriggerButton}
        variant="contained"
        color="primary"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          setOpen(!isOpen);
          setAnchorEl(e.currentTarget);
        }}
      >
        <Notifications fontSize="small" />
        <Typography variant="body2" className={classes.alertLabel}>
          {t('Create Alert')}
        </Typography>
        <ArrowDropDown fontSize="small" />
      </Button>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={() => {
          setOpen(false);
          setAnchorEl(null);
        }}
        PaperProps={{ style: { background: 'transparent', boxShadow: 'none' } }}
      >
        {renderedAlertForm}
      </Menu>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    alertLabel: { marginLeft: '10px' },
    alertTriggerButton: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '3em',
      padding: theme.spacing(0.8, 2.66),
    },
    alertForm: {
      zIndex: theme.zIndex.drawer,
      textAlign: 'left',
    },
    alertFormMenu: {
      backgroundColor: theme.surfaces?.light,
      color: 'white',
      overflowX: 'hidden',
      whiteSpace: 'nowrap',
      height: 'auto',
      maxHeight: '60vh',
      width: '23vw',
      marginTop: '0.5em',
      borderRadius: '10px',
      padding: '10px',
    },
    alertFormButton: {
      height: '36px',
      marginLeft: '3px',
    },
    thresholdInputsContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1em',
      width: '100%',
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
      width: '100%',
    },
    regionSelector: {
      minWidth: '100%',
      maxWidth: '200px',
    },
    numberField: {
      marginTop: '10px',
      width: '50%',
    },
    inputLabelRoot: {
      color: 'white',
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
