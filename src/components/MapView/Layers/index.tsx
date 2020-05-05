import React, { Fragment } from 'react';
import { Source, Layer } from 'react-mapbox-gl';

import { formatServerUri } from '../../../utils/server-utils';
import { LayersMap } from '../../../config/types';

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

function Layers({ layers, selectedDate }: LayersProps) {
  return (
    <>
      {layers &&
        layers
          .valueSeq()
          .toJS()
          .map(({ id, serverUri, opacity }) => (
            <Fragment key={id}>
              <Source
                id={`source-${id}`}
                tileJsonSource={{
                  type: 'raster',
                  tiles: [
                    formatServerUri(serverUri, wmsCommonQuery, selectedDate),
                  ],
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

export interface LayersProps {
  layers: LayersMap;
  selectedDate?: number;
}

export default Layers;
