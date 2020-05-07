import React, { createElement } from 'react';
import { useSelector } from 'react-redux';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { layersSelector } from '../../../context/mapStateSlice';
import { Layer } from '../OLWrappers';

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

function Layers() {
  const layers = useSelector(layersSelector);

  // Note - we should be able to return an array here, but there's a bug in React's Typescript typings.
  // See https://stackoverflow.com/questions/46643517/return-react-16-array-elements-in-typescript
  return (
    <>
      {layers.map(({ id, serverUri, opacity }) => {
        const layer = new TileLayer({
          opacity,
          source: new TileWMS({
            url: serverUri,
            params: wmsCommonQuery,
            serverType: 'geoserver',
          }),
        });
        return createElement(Layer, { key: id, layer });
      })}
    </>
  );
}

export default Layers;
