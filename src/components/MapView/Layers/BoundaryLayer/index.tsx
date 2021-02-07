import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import {
  showPopup,
  fetchPopupData,
} from '../../../../context/tooltipStateSlice';
import { BoundaryLayerProps } from '../../../../config/types';
import { LayerData } from '../../../../context/layers/layer-data';
import {
  layersSelector,
  layerDataSelector,
  dateRangeSelector,
} from '../../../../context/mapStateSlice/selectors';

/**
 * To activate fillOnClick option, we "fill in"
 * polygons with opacity 0.
 */
const fillPaint: MapboxGL.FillPaint = {
  'fill-opacity': 0,
};

function onToggleHover(cursor: string, targetMap: MapboxGL.Map) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

const getLinePaintOptions: (
  layer: BoundaryLayerProps,
) => MapboxGL.LinePaint = layer => {
  return {
    'line-color': 'grey',
    'line-width': 0.1,
    'line-opacity': layer.opacity,
  };
};

function BoundaryLayer({ layer }: { layer: BoundaryLayerProps }) {
  const dispatch = useDispatch();
  const boundaryLayer = useSelector(layerDataSelector(layer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayer || {};
  const layers = useSelector(layersSelector);
  const { startDate } = useSelector(dateRangeSelector);
  // use last layer as reference for popup content
  const layerProps = layers[layers.length - 1];
  const layerData = useSelector(layerDataSelector(layerProps.id));
  if (!data) {
    return null; // boundary layer hasn't loaded yet. We load it on init inside MapView. We can't load it here since its a dependency of other layers.
  }
  return (
    <GeoJSONLayer
      id="boundaries"
      data={data}
      fillPaint={fillPaint}
      linePaint={getLinePaintOptions(layer)}
      fillOnMouseEnter={(evt: any) => onToggleHover('pointer', evt.target)}
      fillOnMouseLeave={(evt: any) => onToggleHover('', evt.target)}
      fillOnClick={async (evt: any) => {
        const coordinates = evt.lngLat;
        const locationName = layer.adminLevelNames
          .map(
            level => get(evt.features[0], ['properties', level], '') as string,
          )
          .join(', ');
        const params = {
          coordinates,
          locationName,
          popupUrl: layerData!.layer.popupUrl,
        };
        const featureProperties = evt.features[0].properties;
        const areacode = featureProperties[layer.adminCode];
        if (params.popupUrl) {
          const url = new URL(params.popupUrl);
          url.searchParams.set('lon', coordinates.lng.toString());
          url.searchParams.set('lat', coordinates.lat.toString());
          url.searchParams.set('areacode', areacode);
          url.searchParams.set('date', startDate ? startDate.toString() : '');
          dispatch(fetchPopupData(url.toString()));
        }
        dispatch(showPopup(params));
      }}
    />
  );
}

export default BoundaryLayer;
