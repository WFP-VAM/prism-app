import React from 'react';
import { Popup } from 'react-mapbox-gl';
import styles from './styles.css';

export function MapTooltip({
  coordinates,
  locationName,
  popupData,
  dataTitle,
}: any) {
  return (
    <Popup anchor="bottom" coordinates={coordinates} style={styles}>
      <h4>Location: {locationName}</h4>
      {dataTitle.size && popupData ? (
        <h4>
          {dataTitle}: {popupData}
        </h4>
      ) : null}
    </Popup>
  );
}
