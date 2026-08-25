import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, IconButton, Typography } from '@mui/material';
import Loader from 'components/Common/Loader';
import { AdminLevelType } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import {
  hidePopup,
  PopupData,
  PopupMetaData,
  PopupTitleData,
  tooltipSelector,
} from 'context/tooltipStateSlice';
import { useAdminNameTranslations } from 'hooks/useAdminNameTranslations';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import { omit } from 'lodash';
import { memo, useCallback, useMemo, useState } from 'react';
import { Popup } from 'react-map-gl/maplibre';
import { useDispatch, useSelector } from 'react-redux';
import { localizeName, usesAdminNameSidecar } from 'utils/admin-name-utils';
import { getEffectiveMultiCountry } from 'utils/universal-country-admin';
import { isUniversalDeployment } from 'utils/universal-utils';

import {
  mapTooltipCloseButtonSx,
  mapTooltipPopupExpandedSx,
  mapTooltipPopupSx,
  mapTooltipTitleSx,
} from './mapTooltipStyles';
import PopupPointDataChart from './PointDataChart/PopupPointDataChart';
import usePointDataChart from './PointDataChart/usePointDataChart';
import PopupCharts from './PopupCharts';
import PopupContent from './PopupContent';
import RedirectToDMP from './RedirectToDMP';

const useZeroBasedAdminLevels =
  isUniversalDeployment() || getEffectiveMultiCountry();
const availableAdminLevels: AdminLevelType[] = useZeroBasedAdminLevels
  ? [0, 1, 2]
  : [1, 2];

const MapTooltip = memo(() => {
  const dispatch = useDispatch();
  const popup = useSelector(tooltipSelector);
  const { t, i18n } = useSafeTranslation();
  const { language, dict } = useAdminNameTranslations();
  const boundaryLayer = getBoundaryLayerSingleton();
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [adminLevel, setAdminLevel] = useState<AdminLevelType | undefined>(
    undefined,
  );

  const { dataset, isLoading } = usePointDataChart();

  const providedPopupTitle = (popup.data as PopupTitleData).title;
  const popupData: PopupData & PopupMetaData = providedPopupTitle
    ? omit(popup.data, 'title', providedPopupTitle.prop)
    : popup.data;
  const localizedLocationName = useMemo(() => {
    if (language === 'en') {
      return popup.locationName;
    }
    if (usesAdminNameSidecar(boundaryLayer)) {
      return popup.locationName
        .split(', ')
        .map(part => localizeName(part, dict))
        .join(', ');
    }
    return popup.locationLocalName;
  }, [
    boundaryLayer,
    dict,
    language,
    popup.locationLocalName,
    popup.locationName,
  ]);

  const defaultPopupTitle = useMemo(() => {
    if (providedPopupTitle) {
      // Title can be a template requiring interpolation
      return t(providedPopupTitle.data as string, providedPopupTitle.context);
    }
    if (isEnglishLanguageSelected(i18n)) {
      return popup.locationName;
    }
    return localizedLocationName;
  }, [i18n, localizedLocationName, popup.locationName, providedPopupTitle, t]);

  // TODO - simplify logic once we revamp admin levels object
  const adminLevelsNames = useCallback(() => {
    const locationName = isEnglishLanguageSelected(i18n)
      ? popup.locationName
      : localizedLocationName;
    const splitNames = locationName.split(', ');

    const adminLevelLimit =
      adminLevel === undefined
        ? availableAdminLevels.length
        : adminLevel + (useZeroBasedAdminLevels ? 1 : 0);
    // If adminLevel is undefined, return the whole array

    return splitNames.splice(0, adminLevelLimit);
  }, [adminLevel, i18n, localizedLocationName, popup.locationName]);

  if (isLoading || !popup.showing || !popup.coordinates) {
    return null;
  }

  const key = JSON.stringify(popup.coordinates);

  if (dataset) {
    return (
      <Box
        component={Popup}
        key={key}
        latitude={popup.coordinates?.[1]}
        longitude={popup.coordinates?.[0]}
        sx={mapTooltipPopupSx}
        closeButton={false}
      >
        <IconButton
          aria-label="close"
          sx={mapTooltipCloseButtonSx}
          onClick={() => dispatch(hidePopup())}
          size="small"
        >
          <FontAwesomeIcon icon={faTimes} style={{ paddingRight: '3px' }} />
        </IconButton>
        <PopupPointDataChart />
      </Box>
    );
  }

  return (
    <Box
      component={Popup}
      key={key}
      latitude={popup.coordinates?.[1]}
      longitude={popup.coordinates?.[0]}
      sx={mapTooltipPopupExpandedSx}
      closeButton={false}
    >
      {adminLevel === undefined && (
        <RedirectToDMP
          dmpDisTyp={popupData.dmpDisTyp}
          dmpSubmissionId={popupData.dmpSubmissionId}
        />
      )}
      <Typography variant="h4" sx={mapTooltipTitleSx}>
        {popupTitle || defaultPopupTitle}
      </Typography>
      {adminLevel === undefined && (
        <PopupContent popupData={popupData} coordinates={popup.coordinates} />
      )}
      {availableAdminLevels.length > 0 && adminLevel !== undefined && (
        <IconButton
          aria-label="close"
          sx={mapTooltipCloseButtonSx}
          onClick={() => setAdminLevel(undefined)}
          size="small"
        >
          <FontAwesomeIcon icon={faTimes} style={{ paddingRight: '3px' }} />
        </IconButton>
      )}
      <PopupCharts
        setPopupTitle={setPopupTitle}
        adminCode={popup.locationAdminCode}
        adminSelectorKey={popup.locationSelectorKey}
        selectorProperties={popup.locationSelectorProperties}
        adminLevel={adminLevel}
        setAdminLevel={setAdminLevel}
        adminLevelsNames={adminLevelsNames}
        availableAdminLevels={availableAdminLevels}
      />
      <Loader showLoader={popup.wmsGetFeatureInfoLoading} />
    </Box>
  );
});

export default MapTooltip;
