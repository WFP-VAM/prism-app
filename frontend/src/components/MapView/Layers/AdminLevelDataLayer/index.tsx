import { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
  MapEventWrapFunctionProps,
} from 'config/types';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { useMapState } from 'utils/useMapState';
import { boundaryCache } from 'utils/boundary-cache';
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
import { getPossibleDatesForLayer, getRequestDate } from 'utils/server-utils';
import { addPopupParams } from 'components/MapView/Layers/layer-utils';
import { FillLayerSpecification } from 'maplibre-gl';
import { opacitySelector } from 'context/opacityStateSlice';
import { addFillPatternImagesInMap } from './utils';

const onClick =
  ({
    layer,
    dispatch,
    t,
  }: MapEventWrapFunctionProps<AdminLevelDataLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    addPopupParams(layer, dispatch, evt, t, true);
  };

const AdminLevelDataLayers = memo(
  ({ layer, before }: { layer: AdminLevelDataLayerProps; before?: string }) => {
    const dispatch = useDispatch();
    const {
      actions: { addLayer, removeLayer },
      ...mapState
    } = useMapState();
    const map = mapState.maplibreMap();
    const serverAvailableDates = useSelector(availableDatesSelector);

    const boundaryId = layer.boundary || firstBoundaryOnView(map);

    const selectedDate = useDefaultDate(layer.id);
    useMapCallback('click', getLayerMapId(layer.id), layer, onClick);
    const layerAvailableDates = getPossibleDatesForLayer(
      layer,
      serverAvailableDates,
    );
    const queryDate = getRequestDate(layerAvailableDates, selectedDate);
    const opacityState = useSelector(opacitySelector(layer.id));
    const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
      | LayerData<AdminLevelDataLayerProps>
      | undefined;
    const { data } = layerData || {};

    useEffect(() => {
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
          boundaryLayers.map(l => removeLayer(l));
          addLayer({ ...boundaryLayer, isPrimary: true });

          // load unique boundary only once
          // to avoid double loading which proven to be performance issue
          if (!isLayerOnView(map, boundaryId)) {
            boundaryCache.getBoundaryData(boundaryLayer, dispatch, map);
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
      if (!data) {
        dispatch(loadLayerData({ layer, date: queryDate, map }));
      }
    }, [
      boundaryId,
      dispatch,
      data,
      layer,
      map,
      queryDate,
      addLayer,
      removeLayer,
    ]);

    if (!data) {
      return null;
    }

    if (!isLayerOnView(map, boundaryId)) {
      return null;
    }

    return (
      <Source type="geojson" data={data}>
        <Layer
          id={getLayerMapId(layer.id)}
          type="fill"
          paint={
            fillPaintData(
              { ...layer, opacity: opacityState || layer.opacity },
              'data',
              layer?.fillPattern,
            ) as FillLayerSpecification['paint']
          }
          beforeId={before || getLayerMapId(boundaryId)}
        />
      </Source>
    );
  },
);

export default AdminLevelDataLayers;
