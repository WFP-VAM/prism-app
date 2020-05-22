import React from 'react';
import { Popup } from 'react-mapbox-gl';
import styles from './styles.css';

export function MapTooltip({ coordinates, locationName, children }: any) {
  return (
    <Popup anchor="bottom" coordinates={coordinates} style={styles}>
      <h4>Location: {locationName}</h4>
      {children}
    </Popup>
  );
}

export function RasterTooltip({ coordinates, locationName }: any) {
  return (
    <MapTooltip coordinates={coordinates} locationName={locationName}>
      <h4>Insert raster data here!</h4>
    </MapTooltip>
  );
}

export function VectorTooltip({
  coordinates,
  locationName,
  vectorData,
  dataTitle,
}: any) {
  return (
    <MapTooltip coordinates={coordinates} locationName={locationName}>
      <h4>
        {dataTitle}: {vectorData}
      </h4>
    </MapTooltip>
  );
}

export function GroundstationTooltip({
  coordinates,
  locationName,
  vectorData,
  dataTitle,
}: any) {
  return (
    <MapTooltip coordinates={coordinates} locationName={locationName}>
      <h4>
        {dataTitle}: {vectorData}
      </h4>
    </MapTooltip>
  );
}
