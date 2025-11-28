import { Box, Button, TextField, Theme, Typography } from '@mui/material';

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'context/hooks';
import { makeStyles, createStyles } from '@mui/styles';
import { LayerKey, PanelSize, WMSLayerProps } from 'config/types';
import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import { AlertRequest, fetchApiData, getPrismUrl } from 'utils/analysis-utils';
import { useBoundaryData } from 'utils/useBoundaryData';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import BoundaryDropdown from 'components/MapView/Layers/BoundaryDropdown';
import { getSelectedBoundaries } from 'context/mapSelectionLayerStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { useSafeTranslation } from 'i18n';
import { ALERT_API_URL } from 'utils/constants';

// Not fully RFC-compliant, but should filter out obviously-invalid emails.
// Source: https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
const EMAIL_REGEX: RegExp =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const boundaryLayer = getBoundaryLayerSingleton();

function AlertsPanel() {
  const classes = useStyles();
  const boundaryLayerData = useBoundaryData(boundaryLayer.id);
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
      boundaryLayerData.data?.features
        ?.filter(feature => feature.properties !== null)
        .map(feature => [
          feature.properties?.[boundaryLayer.adminCode],
          feature,
        ]) ?? [],
    );
  }, [boundaryLayerData]);

  // TODO - leverage boundaryDropdown results directly and try to use
  // top-level boundary data when possible. Eg. when a region is selected,
  // try to use the boundary of that region instead of all the districts.
  const generateGeoJsonForRegionNames = useCallback(() => {
    // TODO - Handle these errors properly.
    if (!boundaryLayerData) {
      throw new Error('Boundary layer data is not loaded yet.');
    }

    if (regionsList.length === 0) {
      throw new Error('Please select at least one region boundary.');
    }

    const features = regionsList
      .map(region => regionCodesToFeatureData[region])
      .filter(Boolean);

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

  const onOptionChange =
    <T extends string>(setterFunc: Dispatch<SetStateAction<T>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value as T;
      setterFunc(value);
      return value;
    };

  // specially for threshold values, also does error checking
  const onThresholdOptionChange = useCallback(
    (thresholdType: 'above' | 'below') =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const renderedAlertForm = useMemo(
    () => (
      <Box className={classes.alertFormMenu}>
        <div className={classes.newAlertFormContainer}>
          <div className={classes.alertFormOptions}>
            <LayerDropdown
              type="wms"
              value={hazardLayerId || ''}
              setValue={setHazardLayerId}
              className={classes.analysisPanelParamText}
              label={t('Hazard Layer')}
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
                type="number"
                value={belowThreshold}
                onChange={onThresholdOptionChange('below')}
              />
              <TextField
                id="filled-number"
                label={t('Above')}
                className={classes.numberField}
                value={aboveThreshold}
                onChange={onThresholdOptionChange('above')}
                type="number"
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
                style: { color: 'black' },
              }}
              InputProps={{
                style: { color: 'black' },
              }}
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
                style: { color: 'black' },
              }}
              InputProps={{
                style: { color: 'black' },
              }}
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
            regionsList.length === 0 ||
            (aboveThreshold === '' && belowThreshold === '')
          }
        >
          <Typography style={{ color: 'white' }} variant="body2">
            {t('Create Alert')}
          </Typography>
        </Button>
      </Box>
    ),
    [
      aboveThreshold,
      alertName,
      alertWaiting,
      belowThreshold,
      classes,
      emailValid,
      hazardLayerId,
      onThresholdOptionChange,
      regionsList.length,
      runAlertForm,
      t,
      thresholdError,
    ],
  );

  return renderedAlertForm;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    alertFormMenu: {
      display: 'flex',
      flexDirection: 'column',
      width: PanelSize.medium,
      height: '100%',
      overflow: 'scroll',
      backgroundColor: 'white',
      color: 'black',
    },
    newAlertFormContainer: {
      padding: '30px 10px 10px 10px',
      height: 'calc(100% - 90px)',
      overflow: 'auto',
    },
    alertFormOptions: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 30,
      marginLeft: 10,
      width: '90%',
      color: 'black',
    },
    analysisPanelParamText: {
      width: '100%',
      color: 'black',
    },
    regionSelector: {
      width: '100%',
    },
    thresholdInputsContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: '16px',
      marginTop: '10px',
    },
    numberField: {
      paddingRight: '10px',
      maxWidth: '140px',
      '& label': {
        color: '#333333',
      },
    },
    innerCreateAlertButton: {
      backgroundColor: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: 'black !important',
      },
      marginTop: 10,
      marginBottom: 10,
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  }),
);

export default AlertsPanel;
