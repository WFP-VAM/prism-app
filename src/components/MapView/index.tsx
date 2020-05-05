import React from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { useSelector } from 'react-redux';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';

import Boundaries from './Boundaries';
import Layers from './Layers';
import DateSelector from './DateSelector';
import { dateRangeSelector, layersSelector } from '../../context/mapStateSlice';
import { availableDatesSelector } from '../../context/serverStateSlice';

import appConfig from '../../config/prism.json';

const Map = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

function MapView({ classes }: MapViewProps) {
  const layers = useSelector(layersSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);
  const selectedLayersDates = serverAvailableDates.filter((_, layerId) =>
    layers.map(l => l.serverLayer).includes(layerId),
  );

  const { startDate } = useSelector(dateRangeSelector);

  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  return (
    <div className={classes.container}>
      <Map
        // eslint-disable-next-line react/style-prop-object
        style="mapbox://styles/mapbox/light-v10"
        center={[longitude, latitude]}
        zoom={[zoom]}
        containerStyle={{
          height: '100vh',
          width: '100vw',
        }}
      >
        <Boundaries />
        <Layers layers={layers} selectedDate={startDate} />
      </Map>
      <DateSelector availableDates={selectedLayersDates} />
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
