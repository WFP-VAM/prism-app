import React from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
} from '@material-ui/core';
import TooltipComponents from './Components';
import { tooltipSelector } from '../../../context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from '../../../i18n';

function MapTooltip({ classes }: TooltipProps) {
  const popup = useSelector(tooltipSelector);
  const { t, i18n } = useSafeTranslation();
  return popup.showing && popup.coordinates ? (
    <Popup
      anchor="bottom"
      coordinates={popup.coordinates}
      className={classes.popup}
    >
      <h4>
        {isEnglishLanguageSelected(i18n)
          ? popup.locationName
          : popup.locationLocalName}
      </h4>
      {Object.entries(popup.data)
        .filter(([, value]) => value.coordinates === popup.coordinates)
        .map(([key, value]) => (
          <h4 key={key}>
            {t(key)}: {value.data}
          </h4>
        ))}
      {popup.remoteData && popup.remoteData.components.map(TooltipComponents)}
      {popup.remoteDataLoading ? <LinearProgress /> : null}
      {popup.wmsGetFeatureInfoLoading ? <LinearProgress /> : null}
    </Popup>
  ) : null;
}

const styles = () =>
  createStyles({
    popup: {
      '& div.mapboxgl-popup-content': {
        background: 'black',
        color: 'white',
        padding: '10px 10px 10px',
      },
      '& div.mapboxgl-popup-tip': {
        'border-top-color': 'black',
      },
    },
  });

export interface TooltipProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapTooltip);
