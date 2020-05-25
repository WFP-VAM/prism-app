import React from 'react';
import { Popup } from 'react-mapbox-gl';
import styles from './styles.css';

export function MapTooltip({
  coordinates,
  locationName,
  popupData,
  showPopup,
}: any) {
  return (
    <>
      {showPopup && (
        <Popup anchor="bottom" coordinates={coordinates} style={styles}>
          <h4>Location: {locationName}</h4>
          {Object.keys(popupData).length
            ? Object.keys(popupData).map((key: any) => (
                <h4 key={key}>
                  {key}: {popupData[key]}
                </h4>
              ))
            : null}
        </Popup>
      )}
    </>
  );
}
