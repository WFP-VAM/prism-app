import React, { Fragment } from 'react';
import { Source, Layer } from 'react-mapbox-gl';
import { useSelector } from 'react-redux';
import { merge, unset } from 'lodash';
import { format, parse } from 'url';

import { layersSelector } from '../../../context/mapStateSlice';

const wmsCommonQuery = {
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
};

function formatServerUri(serverUri: string) {
  // The second arg of 'parse' allows us to have query as an object
  const { query, ...parsedUrl } = parse(serverUri, true);

  // Removing 'search' to be able to format by 'query'
  unset(parsedUrl, 'search');

  return decodeURI(
    format({ ...parsedUrl, query: merge(query, wmsCommonQuery) }),
  );
}

function Layers() {
  const layers = useSelector(layersSelector);

  return (
    <>
      {layers.toJS().map(({ id, serverUri, opacity }) => (
        <Fragment key={id}>
          <Source
            id={`source-${id}`}
            tileJsonSource={{
              type: 'raster',
              tiles: [formatServerUri(serverUri)],
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
