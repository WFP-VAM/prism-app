import React from 'react';
import ReactMapboxGl from 'react-mapbox-gl';

import Layers from './Layers';
import appConfig from '../../config/prism.json';

const Map = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

function MapView() {
  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  return (
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
      <Layers />
    </Map>
  );
}

export default MapView;
