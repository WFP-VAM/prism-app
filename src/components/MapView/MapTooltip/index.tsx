import React from 'react';
import { Popup } from 'react-mapbox-gl';
import { merge } from 'lodash';
import { createStyles, withStyles } from '@material-ui/core';

export interface PopupData {
  [key: string]: { data: number; coordinates: GeoJSON.Position };
}

interface MapTooltip {
  coordinates?: GeoJSON.Position;
  locationName?: string;
  popupData: PopupData;
  classes: any;
}

export function mergePopupData(
  setPopupData: any,
  popupData: PopupData,
  newData: PopupData,
) {
  setPopupData(merge(popupData, newData));
}

function MapTooltip({
  coordinates,
  locationName,
  popupData,
  classes,
}: MapTooltip) {
  return (
    <Popup anchor="bottom" coordinates={coordinates!} className={classes.popup}>
      <h4>Location: {locationName}</h4>
      {Object.entries(popupData)
        .filter(([, value]) => value.coordinates === coordinates)
        .map(([key, value]) => (
          <h4 key={key}>
            {key}: {value.data}
          </h4>
        ))}
    </Popup>
  );
}

const styles = () =>
  createStyles({
    popup: {
      'mapboxgl-popup-content': {
        background: 'black',
        color: 'white',
      },
      'mapboxgl-popup-tip': {
        'border-top-color': 'black',
      },
    },
  });

export default withStyles(styles)(MapTooltip);
