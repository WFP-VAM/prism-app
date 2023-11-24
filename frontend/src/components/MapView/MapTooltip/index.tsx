import React, { memo, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
  Typography,
} from '@material-ui/core';
import { tooltipSelector } from 'context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import { AdminLevelType } from 'config/types';
import { appConfig } from 'config';
import PopupCharts from './PopupCharts';
import RedirectToDMP from './RedirectToDMP';
import PopupContent from './PopupContent';
import PopupPointDataChart from './PointDataChart/PopupPointDataChart';
import usePointDataChart from './PointDataChart/usePointDataChart';

const styles = () =>
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
      '& div.mapboxgl-popup-content': {
        background: 'black',
        color: 'white',
        padding: '5px 5px 5px 5px',
        maxWidth: '40em',
        maxHeight: '400px',
        overflow: 'auto',
      },
      '& div.mapboxgl-popup-tip': {
        'border-top-color': 'black',
        'border-bottom-color': 'black',
      },
    },
  });

const { multiCountry } = appConfig;
const availableAdminLevels: AdminLevelType[] = multiCountry
  ? [0, 1, 2]
  : [1, 2];

interface TooltipProps extends WithStyles<typeof styles> {}

const MapTooltip = ({ classes }: TooltipProps) => {
  const popup = useSelector(tooltipSelector);
  const { i18n } = useSafeTranslation();
  const [popupTitle, setPopupTitle] = useState<string>('');
  const [adminLevel, setAdminLevel] = useState<AdminLevelType | undefined>(
    undefined,
  );

  const { dataset, isLoading } = usePointDataChart();

  const defaultPopupTitle = useMemo(() => {
    if (isEnglishLanguageSelected(i18n)) {
      return popup.locationName;
    }
    return popup.locationLocalName;
  }, [i18n, popup.locationLocalName, popup.locationName]);

  const renderedPopupLoader = useMemo(() => {
    if (!popup.wmsGetFeatureInfoLoading) {
      return null;
    }
    return <LinearProgress />;
  }, [popup.wmsGetFeatureInfoLoading]);

  const popupData = popup.data;

  // TODO - simplify logic once we revamp admin levels ojbect
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
    // eslint-disable-next-line fp/no-mutating-methods
    return splitNames.splice(0, adminLevelLimit);
  }, [adminLevel, i18n, popup.locationLocalName, popup.locationName]);

  if (isLoading || !popup.showing || !popup.coordinates) {
    return null;
  }

  if (dataset) {
    return (
      <Popup coordinates={popup.coordinates} className={classes.popup}>
        <PopupPointDataChart adminLevelsNames={() => [...adminLevelsNames()]} />
      </Popup>
    );
  }

  return (
    <Popup coordinates={popup.coordinates} className={classes.popup}>
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
      <PopupCharts
        setPopupTitle={setPopupTitle}
        adminLevel={adminLevel}
        setAdminLevel={setAdminLevel}
        adminLevelsNames={adminLevelsNames}
        availableAdminLevels={availableAdminLevels}
      />
      {renderedPopupLoader}
    </Popup>
  );
};

export default memo(withStyles(styles)(MapTooltip));
