import React, { Fragment } from 'react';
import ReactMapboxGl, { Source, Layer } from 'react-mapbox-gl';
import { chain } from 'lodash';
import { useSelector } from 'react-redux';

import { selectlayers } from '../../context/filters/filtersSlice';
import appConfig from '../../config/prism.json';

const Map = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN as string,
});

const wmsParams = chain({
  version: '1.1.1',
  request: 'GetMap',
  format: 'image/png',
  transparent: true,
  exceptions: 'application/vnd.ogc.se_inimage',
  bboxsr: 3857,
  imagesr: 3857,
  width: 256,
  height: 256,
  srs: 'EPSG:3857',
  bbox: '{bbox-epsg-3857}',
})
  .map((value, key) => `${key}=${value}`)
  .join('&')
  .value();

function MapView() {
  const {
    map: { latitude, longitude, zoom },
  } = appConfig;

  const layers = useSelector(selectlayers);

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
      {layers.toJS().map(({ id, serverUri, opacity }) => (
        <Fragment key={id}>
          <Source
            id={`source-${id}`}
            tileJsonSource={{
              type: 'raster',
              tiles: [`${serverUri}&${wmsParams}`],
              tileSize: 256,
            }}
          />

          <Layer
            type="raster"
            id={`layer-${id}`}
            sourceId={`source-${id}`}
            paint={{ 'raster-opacity': opacity }}
          />
        </Fragment>
      ))}
    </Map>
  );
}

export default MapView;
