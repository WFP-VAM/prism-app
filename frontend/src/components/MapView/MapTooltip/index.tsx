import React, { memo, useMemo, useState } from 'react';
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
import PopupCharts from './PopupCharts';
import RedirectToDMP from './RedirectToDMP';
import PopupContent from './PopupContent';

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
      position: 'relative',
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

interface TooltipProps extends WithStyles<typeof styles> {}

const MapTooltip = ({ classes }: TooltipProps) => {
  const popup = useSelector(tooltipSelector);
  const { i18n } = useSafeTranslation();

  const popupData = popup.data;

  const [popupTitle, setPopupTitle] = useState<string>('');
  const [adminLevel, setAdminLevel] = useState<AdminLevelType | undefined>(
    undefined,
  );
  const [showDataset, setShowDataset] = useState<boolean>(false);

  const showDetails = adminLevel === undefined && !showDataset;

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

  if (!popup.showing || !popup.coordinates) {
    return null;
  }

  return (
    <Popup coordinates={popup.coordinates} className={classes.popup}>
      {showDetails && (
        <RedirectToDMP
          dmpDisTyp={popupData.dmpDisTyp}
          dmpSubmissionId={popupData.dmpSubmissionId}
        />
      )}
      <Typography variant="h4" color="inherit" className={classes.title}>
        {popupTitle || defaultPopupTitle}
      </Typography>
      {showDetails && (
        <PopupContent popupData={popupData} coordinates={popup.coordinates} />
      )}
      <PopupCharts
        popup={popup}
        setPopupTitle={setPopupTitle}
        adminLevel={adminLevel}
        setAdminLevel={setAdminLevel}
        showDataset={showDataset}
        setShowDataset={setShowDataset}
      />
      {renderedPopupLoader}
    </Popup>
  );
};

export default memo(withStyles(styles)(MapTooltip));
