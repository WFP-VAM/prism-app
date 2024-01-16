import React, { memo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
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
import { firstBoundaryOnView, isLayerOnView } from 'utils/map-utils';
import { fillPaintData } from 'components/MapView/Layers/styles';
import { availableDatesSelector } from 'context/serverStateSlice';
import { getRequestDate } from 'utils/server-utils';
import {
  addPopupParams,
  legendToStops,
} from 'components/MapView/Layers/layer-utils';
import { convertSvgToPngBase64Image, getSVGShape } from 'utils/image-utils';
import { Dispatch } from 'redux';
import { TFunction } from 'i18next';
import { FillLayerSpecification } from 'maplibre-gl';

export const getLayerId = (layer: AdminLevelDataLayerProps) =>
  `layer-${layer.id}`;

export const onClick = ({
  layer,
  dispatch,
  t,
}: {
  layer: AdminLevelDataLayerProps;
  dispatch: Dispatch;
  t: TFunction;
}) => (evt: MapLayerMouseEvent) => {
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
  const layerAvailableDates = serverAvailableDates[layer.id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const { data } = layerData || {};
  const { features } = data || {};

  const createFillPatternsForLayerLegends = useCallback(async () => {
    return Promise.all(
      legendToStops(layer.legend).map(async legendToStop => {
        return convertSvgToPngBase64Image(
          getSVGShape(legendToStop[1] as string, layer.fillPattern),
        );
      }),
    );
  }, [layer.fillPattern, layer.legend]);

  const addFillPatternImageInMap = useCallback(
    (index: number, convertedImage?: string) => {
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
    },
    [layer.fillPattern, layer.id, map],
  );

  const addFillPatternImagesInMap = useCallback(async () => {
    const fillPatternsForLayer = await createFillPatternsForLayerLegends();
    fillPatternsForLayer.forEach((base64Image, index) => {
      addFillPatternImageInMap(index, base64Image);
    });
  }, [addFillPatternImageInMap, createFillPatternsForLayerLegends]);

  useEffect(() => {
    if (isLayerOnView(map, layer.id)) {
      return;
    }
    addFillPatternImagesInMap();
  }, [addFillPatternImagesInMap, layer.id, map]);

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

  const layerId = getLayerId(layer);

  return (
    <Source id={layerId} type="geojson" data={features}>
      <Layer
        id={layerId}
        type="fill"
        paint={
          fillPaintData(
            layer,
            'data',
            layer?.fillPattern,
          ) as FillLayerSpecification['paint']
        }
        beforeId={before || `layer-${boundaryId}-line`}
      />
    </Source>
  );
};

export default memo(AdminLevelDataLayers);
