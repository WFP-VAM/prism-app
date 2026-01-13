import { memo, useCallback, useMemo, useState } from 'react';
import { omit } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { Popup } from 'react-map-gl/maplibre';
import {
  createStyles,
  Typography,
  IconButton,
  makeStyles,
} from '@material-ui/core';
import {
  hidePopup,
  PopupData,
  PopupMetaData,
  PopupTitleData,
  tooltipSelector,
} from 'context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import { AdminLevelType } from 'config/types';
import { appConfig } from 'config';
import Loader from 'components/Common/Loader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import PopupCharts from './PopupCharts';
import RedirectToDMP from './RedirectToDMP';
import PopupContent from './PopupContent';
import PopupPointDataChart from './PointDataChart/PopupPointDataChart';
import usePointDataChart from './PointDataChart/usePointDataChart';

const useStyles = makeStyles(() =>
  createStyles({
    phasePopulationTable: {
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      width: '100%',
      borderWidth: '1px;',
      borderColor: 'inherit',
      borderStyle: 'solid',
      border: '1px solid white',
    },
    phasePopulationTableRow: {
      border: '1px solid white',
    },
    title: {
      fontWeight: 600,
      marginBottom: '8px',
    },
    text: {
      marginBottom: '4px',
    },
    popup: {
      // Overrides the default maxWidth of 240px set by react-map-gl
      maxWidth: '40em !important',
      zIndex: 5,
      '& div.maplibregl-popup-content': {
        background: 'black',
        color: 'white',
        padding: '5px 5px 5px 5px',
        maxHeight: '400px',
        overflow: 'auto',
      },
      '& div.maplibregl-popup-tip': {
        'border-top-color': 'black',
        'border-bottom-color': 'black',
      },
    },
    closeButton: {
      color: 'white',
      position: 'absolute',
      right: 0,
      top: 0,
    },
  }),
);

const { multiCountry } = appConfig;
const availableAdminLevels: AdminLevelType[] = multiCountry
  ? [0, 1, 2]
  : [1, 2];

const MapTooltip = memo(() => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const popup = useSelector(tooltipSelector);
  const { t, i18n } = useSafeTranslation();
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [adminLevel, setAdminLevel] = useState<AdminLevelType | undefined>(
    undefined,
  );

  const { dataset, isLoading } = usePointDataChart();

  const providedPopupTitle = (popup.data as PopupTitleData).title;
  const popupData: PopupData & PopupMetaData = providedPopupTitle
    ? omit(popup.data, 'title', providedPopupTitle.prop)
    : popup.data;
  const defaultPopupTitle = useMemo(() => {
    if (providedPopupTitle) {
      // Title can be a template requiring interpolation
      return t(providedPopupTitle.data as string, providedPopupTitle.context);
    }
    if (isEnglishLanguageSelected(i18n)) {
      return popup.locationName;
    }
    return popup.locationLocalName;
  }, [
    i18n,
    popup.locationLocalName,
    popup.locationName,
    providedPopupTitle,
    t,
  ]);

  // TODO - simplify logic once we revamp admin levels object
  const adminLevelsNames = useCallback(() => {
    const locationName = isEnglishLanguageSelected(i18n)
      ? popup.locationName
      : popup.locationLocalName;
    const splitNames = locationName.split(', ');

    const adminLevelLimit =
      adminLevel === undefined
        ? availableAdminLevels.length
        : adminLevel + (multiCountry ? 1 : 0);
    // If adminLevel is undefined, return the whole array

    return splitNames.splice(0, adminLevelLimit);
  }, [adminLevel, i18n, popup]);

  if (isLoading || !popup.showing || !popup.coordinates) {
    return null;
  }

  const key = JSON.stringify(popup.coordinates);

  if (dataset) {
    return (
      <Popup
        key={key}
        latitude={popup.coordinates?.[1]}
        longitude={popup.coordinates?.[0]}
        className={classes.popup}
        closeButton={false}
      >
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={() => dispatch(hidePopup())}
          size="small"
        >
          <FontAwesomeIcon icon={faTimes} style={{ paddingRight: '3px' }} />
        </IconButton>
        <PopupPointDataChart />
      </Popup>
    );
  }

  return (
    <Popup
      key={key}
      latitude={popup.coordinates?.[1]}
      longitude={popup.coordinates?.[0]}
      className={classes.popup}
      style={{ zIndex: 5, maxWidth: 'none' }}
      closeButton={false}
    >
      {adminLevel === undefined && (
        <RedirectToDMP
          dmpDisTyp={popupData.dmpDisTyp}
          dmpSubmissionId={popupData.dmpSubmissionId}
        />
      )}
      <Typography variant="h4" color="inherit" className={classes.title}>
        {popupTitle || defaultPopupTitle}
      </Typography>
      {adminLevel === undefined && (
        <PopupContent popupData={popupData} coordinates={popup.coordinates} />
      )}
      {availableAdminLevels.length > 0 && adminLevel !== undefined && (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
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
        adminLevel={adminLevel}
        setAdminLevel={setAdminLevel}
        adminLevelsNames={adminLevelsNames}
        availableAdminLevels={availableAdminLevels}
      />
      <Loader showLoader={popup.wmsGetFeatureInfoLoading} />
    </Popup>
  );
});

export default MapTooltip;
