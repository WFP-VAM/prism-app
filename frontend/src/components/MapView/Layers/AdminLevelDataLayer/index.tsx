import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
  MapEventWrapFunctionProps,
} from 'config/types';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import {
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { addLayer, removeLayer } from 'context/mapStateSlice';
import { useDefaultDate } from 'utils/useDefaultDate';
import { getBoundaryLayers, LayerDefinitions } from 'config/utils';
import { addNotification } from 'context/notificationStateSlice';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
  useMapCallback,
} from 'utils/map-utils';
import { fillPaintData } from 'components/MapView/Layers/styles';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getRequestDate } from 'utils/server-utils';
import {
  addPopupParams,
  legendToStops,
} from 'components/MapView/Layers/layer-utils';
import { convertSvgToPngBase64Image, getSVGShape } from 'utils/image-utils';
import { Map, FillLayerSpecification } from 'maplibre-gl';

export const createFillPatternsForLayerLegends = async (
  layer: AdminLevelDataLayerProps,
) => {
  return Promise.all(
    legendToStops(layer.legend).map(async legendToStop => {
      return convertSvgToPngBase64Image(
        getSVGShape(legendToStop[1] as string, layer.fillPattern),
      );
    }),
  );
};

export const addFillPatternImageInMap = (
  layer: AdminLevelDataLayerProps,
  map: Map | undefined,
  index: number,
  convertedImage?: string,
) => {
  if (!map || !layer.fillPattern || !convertedImage) {
    return;
  }
  map.loadImage(convertedImage, (err: any, image) => {
    // Throw an error if something goes wrong.
    if (err) {
      throw err;
    }
    if (!image) {
      return;
    }
    // Add the image to the map style.
    map.addImage(`fill-pattern-${layer.id}-legend-${index}`, image);
  });
};

export const addFillPatternImagesInMap = async (
  layer: AdminLevelDataLayerProps,
  map: any,
) => {
  const fillPatternsForLayer = await createFillPatternsForLayerLegends(layer);
  fillPatternsForLayer.forEach((base64Image, index) => {
    addFillPatternImageInMap(layer, map, index, base64Image);
  });
};

const onClick = ({
  layer,
  dispatch,
  t,
}: MapEventWrapFunctionProps<AdminLevelDataLayerProps>) => (
  evt: MapLayerMouseEvent,
) => {
  addPopupParams(layer, dispatch, evt, t, true);
};

const AdminLevelDataLayers = ({
  layer,
  before,
}: {
  layer: AdminLevelDataLayerProps;
  before?: string;
}) => {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const boundaryId = layer.boundary || firstBoundaryOnView(map);

  const selectedDate = useDefaultDate(layer.id);
  useMapCallback('click', getLayerMapId(layer.id), layer, onClick);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const { data } = layerData || {};
  const { features } = data || {};

  useEffect(() => {
    if (isLayerOnView(map, layer.id)) {
      return;
    }
    addFillPatternImagesInMap(layer, map);
  }, [layer, map]);

  useEffect(() => {
    // before loading layer check if it has unique boundary?
    const boundaryLayers = getBoundaryLayers();
    const boundaryLayer = LayerDefinitions[
      boundaryId as LayerKey
    ] as BoundaryLayerProps;

    if ('boundary' in layer) {
      if (Object.keys(LayerDefinitions).includes(boundaryId)) {
        boundaryLayers.map(l => dispatch(removeLayer(l)));
        dispatch(addLayer({ ...boundaryLayer, isPrimary: true }));

        // load unique boundary only once
        // to avoid double loading which proven to be performance issue
        if (!isLayerOnView(map, boundaryId)) {
          dispatch(loadLayerData({ layer: boundaryLayer }));
        }
      } else {
        dispatch(
          addNotification({
            message: `Invalid unique boundary: ${boundaryId} for ${layer.id}`,
            type: 'error',
          }),
        );
      }
    }
    if (!features) {
      dispatch(loadLayerData({ layer, date: queryDate }));
    }
  }, [boundaryId, dispatch, features, layer, map, queryDate]);

  if (!features) {
    return null;
  }

  if (!isLayerOnView(map, boundaryId)) {
    return null;
  }

  return (
    <Source type="geojson" data={features}>
      <Layer
        id={getLayerMapId(layer.id)}
        type="fill"
        paint={
          fillPaintData(
            layer,
            'data',
            layer?.fillPattern,
          ) as FillLayerSpecification['paint']
        }
        beforeId={before || getLayerMapId(boundaryId)}
      />
    </Source>
  );
};

export default memo(AdminLevelDataLayers);
