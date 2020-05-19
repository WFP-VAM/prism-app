import React, { useState } from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { useSelector } from 'react-redux';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';

import Boundaries from './Boundaries';
import Layers from './Layers';
import { MapTooltip } from './MapTooltip';
import Legends from './Legends';
import DateSelector from './DateSelector';
import { dateRangeSelector, layersSelector } from '../../context/mapStateSlice';
import { availableDatesSelector } from '../../context/serverStateSlice';

import appConfig from '../../config/prism.json';
import { AvailableDates } from '../../config/types';

const MapboxMap = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

function MapView({ classes }: MapViewProps) {
  const [popupCoordinates, setpopupCoordinates] = useState();
  const [popupLocation, setpopupLocation] = useState();
  const layers = useSelector(layersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const selectedLayerDates = layers
    .map(({ serverLayer }) =>
      serverLayer ? serverAvailableDates.get(serverLayer) : undefined,
    )
    .filter(value => value) as AvailableDates;

  const { startDate } = useSelector(dateRangeSelector);

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  return (
    <div className={classes.container}>
      <MapboxMap
        // eslint-disable-next-line react/style-prop-object
        style="mapbox://styles/mapbox/light-v10"
        center={[longitude, latitude]}
        zoom={[zoom]}
        containerStyle={{
          height: '100vh',
          width: '100vw',
        }}
      >
        <Boundaries
          getCoordinates={(coordinates: any) => {
            setpopupCoordinates(coordinates);
          }}
          getLocationName={(locationName: any) => {
            setpopupLocation(locationName);
          }}
        />
        {popupCoordinates && layers.size === 0 && (
          <MapTooltip
            coordinates={popupCoordinates}
            locationName={popupLocation}
          />
        )}
        <Layers layers={layers} selectedDate={startDate} />
      </MapboxMap>
      <DateSelector availableDates={selectedLayerDates} />
      <Legends layers={layers} />
    </div>
  );
}

const styles = () =>
  createStyles({
    container: {
      position: 'relative',
    },
  });

export interface MapViewProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapView);
