import React, { Fragment } from 'react';
import { Source, Layer } from 'react-mapbox-gl';
import { useSelector } from 'react-redux';
import { chain } from 'lodash';

import { selectlayers } from '../../../context/filters/filtersSlice';

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

function Layers() {
  const layers = useSelector(selectlayers);

  return (
    <>
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
    </>
  );
}

export default Layers;
