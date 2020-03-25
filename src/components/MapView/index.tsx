import React from 'react';
import ReactMapboxGl, { Source, Layer } from 'react-mapbox-gl';

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
      <Source
        id="source_id"
        tileJsonSource={{
          type: 'raster',
          tiles: [
            'http://3.136.214.209:8080/geoserver/prism/wms?&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&exceptions=application%2Fvnd.ogc.se_inimage&bboxSR=3857&imageSR=3857&width=256&height=256&srs=EPSG%3A3857&bbox={bbox-epsg-3857}&LAYERS=NSO-pop-2018',
          ],
          tileSize: 256,
        }}
      />
      <Source
        id="source_id_2"
        tileJsonSource={{
          type: 'raster',
          tiles: [
            'http://3.136.214.209:8080/geoserver/prism/wms?&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&exceptions=application%2Fvnd.ogc.se_inimage&bboxSR=3857&imageSR=3857&width=256&height=256&srs=EPSG%3A3857&bbox={bbox-epsg-3857}&LAYERS=rainfall_anomaly',
          ],
          tileSize: 256,
        }}
      />

      <Layer
        type="raster"
        id="layer_id"
        sourceId="source_id"
        paint={{ 'raster-opacity': 0 }}
      />

      <Layer
        type="raster"
        id="layer_id_2"
        sourceId="source_id_2"
        paint={{ 'raster-opacity': 0.2 }}
      />
    </Map>
  );
}

export default MapView;
