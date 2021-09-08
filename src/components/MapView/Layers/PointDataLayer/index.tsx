import React, { useEffect } from 'react';
import { get } from 'lodash';
import * as MapboxGL from 'mapbox-gl';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer } from 'react-mapbox-gl';
import { legendToStops } from '../layer-utils';
import { PointDataLayerProps } from '../../../../config/types';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useDefaultDate } from '../../../../utils/useDefaultDate';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);

  const layerData = useSelector(layerDataSelector(layer.id, selectedDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};

  useEffect(() => {
    if (!data) {
      dispatch(loadLayerData({ layer, date: selectedDate }));
    }
  }, [data, dispatch, layer, selectedDate]);

  if (!data) {
    return null;
  }

  const circleLayout: MapboxGL.CircleLayout = { visibility: 'visible' };
  const circlePaint: MapboxGL.CirclePaint = {
    'circle-opacity': layer.opacity || 0.3,
    'circle-color': {
      property: layer.measure,
      stops: legendToStops(layer.legend),
    },
  };

  const geojsonData = {
    type: 'geojson',
    data,
  };

  return (
    <>
      <Source id="source_id" geoJsonSource={geojsonData} />
      <Layer
        type="circle"
        id="layer_id"
        sourceId="source_id"
        circleLayout={circleLayout}
        circlePaint={circlePaint}
      />
    </>
  );

  // return (
  //   <GeoJSONLayer
  //     before="boundaries-line"
  //     id={`layer-${layer.id}`}
  //     data={JSON.stringify(data.properties)}
  //     circleLayout={circleLayout}
  //     circlePaint={circlePaint}
  //     circleOnClick={(evt: any) => {
  //       dispatch(
  //         addPopupData({
  //           [layer.title]: {
  //             data: get(
  //               evt.features[0],
  //               `properties.${layer.measure}`,
  //               'No Data',
  //             ),
  //             coordinates: evt.lngLat,
  //           },
  //         }),
  //       );
  //     }}
  //   />
  // );
}

export default PointDataLayer;
