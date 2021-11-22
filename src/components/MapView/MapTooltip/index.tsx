import React from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  CircularProgress,
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
} from '@material-ui/core';
import { tooltipSelector } from '../../../context/tooltipStateSlice';
import TooltipComponents from './Components/index';

function MapTooltip({ classes }: TooltipProps) {
  const popup = useSelector(tooltipSelector);

  return popup.showing && popup.coordinates ? (
    <Popup
      anchor="bottom"
      coordinates={popup.coordinates}
      className={classes.popup}
    >
      <h4>{popup.locationName}</h4>
      {popup.remoteData
        ? popup.remoteData.components.map(TooltipComponents)
        : Object.entries(popup.data)
            .filter(([, value]) => value.coordinates === popup.coordinates)
            .map(([key, value]) => (
              <h4 key={key}>
                {key}: {value.data}
              </h4>
            ))}
      {popup.remoteDataLoading ? <CircularProgress /> : null}
      {popup.wmsGetFeatureInfoLoading ? <LinearProgress /> : null}
    </Popup>
  ) : null;
}

const styles = () =>
  createStyles({
    popup: {
      '& div.mapboxgl-popup-content': {
        padding: '10px 10px 10px',
      },
    },
  });

export interface TooltipProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapTooltip);
