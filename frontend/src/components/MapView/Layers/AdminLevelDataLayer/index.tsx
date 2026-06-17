import { useClip } from 'components/MapExport/clipContext';
import { addPopupParams } from 'components/MapView/Layers/layer-utils';
import { fillPaintData } from 'components/MapView/Layers/styles';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
  MapEventWrapFunctionProps,
} from 'config/types';
import { getBoundaryLayers, LayerDefinitions } from 'config/utils';
import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { addNotification } from 'context/notificationStateSlice';
import { opacitySelector } from 'context/opacityStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { FillLayerSpecification } from 'maplibre-gl';
import { memo, useEffect } from 'react';
import { Layer, MapLayerMouseEvent, Source } from 'react-map-gl/maplibre';
import { useDispatch, useSelector } from 'react-redux';
import { boundaryCache } from 'utils/boundary-cache';
import {
  firstBoundaryOnView,
  getLayerMapId,
  isLayerOnView,
  useMapCallback,
} from 'utils/map-utils';
import { getPossibleDatesForLayer, getRequestDate } from 'utils/server-utils';
import { useClippedFeatureCollection } from 'utils/useClippedFeatureCollection';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useMapState } from 'utils/useMapState';

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

    const clip = useClip();
    const clippedData = useClippedFeatureCollection(data, clip);

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

    if (!data || !clippedData) {
      return null;
    }

    if (!isLayerOnView(map, boundaryId)) {
      return null;
    }

    return (
      <Source type="geojson" data={clippedData}>
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
