import React from 'react';
import ReactMapboxGl from 'react-mapbox-gl';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';

import Boundaries from './Boundaries';
import Layers from './Layers';
import DateSelector from './DateSelector';
import appConfig from '../../config/prism.json';

const Map = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

function MapView({ classes }: MapViewProps) {
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
        <Layers />
      </Map>
      <DateSelector />
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
