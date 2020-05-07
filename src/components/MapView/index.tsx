import React from 'react';
import { Box } from '@material-ui/core';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';

// import Boundaries from './Boundaries';
// import Layers from './Layers';
import DateSelector from './DateSelector';
import appConfig from '../../config/prism.json';
import { Layer, Map } from './OLWrappers';

const baseMapLayer = new TileLayer({ source: new OSM() });

function MapView() {
  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  return (
    <Box height="100%">
      <Map view={{ center: [longitude, latitude], zoom }}>
        <Layer layer={baseMapLayer} />
      </Map>
      <DateSelector />
    </Box>
  );
}

export default MapView;
