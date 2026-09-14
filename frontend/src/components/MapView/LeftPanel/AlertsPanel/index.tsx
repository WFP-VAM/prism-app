import { Box, Button, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  analysisPanelParamTextSx,
  formContainerSx,
} from 'components/Common/formComponentStyles';
import BoundaryDropdown from 'components/MapView/Layers/BoundaryDropdown';
import LayerDropdown from 'components/MapView/Layers/LayerDropdown';
import { LayerKey, WMSLayerProps } from 'config/types';
import { getBoundaryLayerSingleton, LayerDefinitions } from 'config/utils';
import { getSelectedBoundaries } from 'context/mapSelectionLayerStateSlice';
import { addNotification } from 'context/notificationStateSlice';
import { useSafeTranslation } from 'i18n';
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  buildFeatureCollectionFromFeatures,
  resolveFeaturesForAdminCodes,
} from 'utils/adminAreaSelection';
import { AlertRequest, fetchApiData, getPrismUrl } from 'utils/analysis-utils';
import { boundaryCache } from 'utils/boundary-cache';
import { ALERT_API_URL } from 'utils/constants';
import { useBoundaryData } from 'utils/useBoundaryData';

import {
  alertFormMenuSx,
  createAlertButtonSx,
  newAlertFormContainerSx,
  numberFieldSx,
  regionSelectorSx,
  thresholdInputsContainerSx,
} from '../leftPanelStyles';

// Not fully RFC-compliant, but should filter out obviously-invalid emails.
// Source: https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
const EMAIL_REGEX: RegExp =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const boundaryLayer = getBoundaryLayerSingleton();

function AlertsPanel() {
  const theme = useTheme();
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

  const { t, i18n } = useSafeTranslation();

  const generateGeoJsonForRegionNames = useCallback(() => {
    if (!boundaryLayerData?.data) {
      throw new Error('Boundary layer data is not loaded yet.');
    }

    if (regionsList.length === 0) {
      throw new Error('Please select at least one region boundary.');
    }

    const features = resolveFeaturesForAdminCodes(
      regionsList,
      boundaryLayerData.data,
      boundaryLayer,
      i18n,
      layerId => boundaryCache.getCachedData(layerId),
    );

    if (features.length === 0) {
      throw new Error('No boundary features matched the selected regions.');
    }

    return buildFeatureCollectionFromFeatures(features, boundaryLayerData.data);
  }, [boundaryLayerData, i18n, regionsList]);

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
      <Box sx={alertFormMenuSx}>
        <Box sx={newAlertFormContainerSx}>
          <Box sx={formContainerSx()}>
            <Box sx={analysisPanelParamTextSx}>
              <LayerDropdown
                type="wms"
                value={hazardLayerId || ''}
                setValue={setHazardLayerId}
                label={t('Hazard Layer')}
                placeholder="Choose hazard layer"
              />
            </Box>
          </Box>
          <Box sx={formContainerSx()}>
            <Typography variant="body2">{t('Threshold')}</Typography>
            <Box sx={thresholdInputsContainerSx}>
              <TextField
                id="filled-number"
                error={!!thresholdError}
                helperText={t(thresholdError || '')}
                sx={numberFieldSx}
                label={t('Below')}
                type="number"
                value={belowThreshold}
                onChange={onThresholdOptionChange('below')}
              />
              <TextField
                id="filled-number"
                label={t('Above')}
                sx={numberFieldSx}
                value={aboveThreshold}
                onChange={onThresholdOptionChange('above')}
                type="number"
              />
            </Box>
          </Box>
          <Box sx={formContainerSx()}>
            <Typography variant="body2">{t('Regions')}</Typography>
            <Box sx={regionSelectorSx}>
              <BoundaryDropdown className="" />
            </Box>
          </Box>
          <Box sx={formContainerSx()}>
            <TextField
              id="alert-name"
              label={t('Alert Name')}
              type="text"
              slotProps={{
                inputLabel: {
                  style: { color: 'black' },
                },
                input: {
                  style: { color: 'black' },
                },
              }}
              value={alertName}
              onChange={e => setAlertName(e.target.value)}
              fullWidth
            />
          </Box>
          <Box sx={formContainerSx()}>
            <TextField
              id="email-address"
              label={t('Email Address')}
              type="text"
              slotProps={{
                inputLabel: {
                  style: { color: 'black' },
                },
                input: {
                  style: { color: 'black' },
                },
              }}
              onChange={onChangeEmail}
              fullWidth
            />
          </Box>
        </Box>
        <Button
          sx={createAlertButtonSx(theme)}
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
      emailValid,
      hazardLayerId,
      onThresholdOptionChange,
      regionsList.length,
      runAlertForm,
      t,
      theme,
      thresholdError,
    ],
  );

  return renderedAlertForm;
}

export default AlertsPanel;
