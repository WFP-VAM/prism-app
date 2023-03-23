import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
} from '../../../../config/types';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import { addLayer, removeLayer } from '../../../../context/mapStateSlice';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getBoundaryLayers, LayerDefinitions } from '../../../../config/utils';
import { addNotification } from '../../../../context/notificationStateSlice';
import {
  firstBoundaryOnView,
  isLayerOnView,
} from '../../../../utils/map-utils';
import { useSafeTranslation } from '../../../../i18n';
import { fillPaintData } from '../styles';
import { availableDatesSelector } from '../../../../context/serverStateSlice';
import { getRequestDate } from '../../../../utils/server-utils';
import { addPopupParams } from '../layer-utils';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
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
  const { t } = useSafeTranslation();

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
  }, [dispatch, features, layer, queryDate, boundaryId, map]);

  if (!features) {
    return null;
  }

  if (!isLayerOnView(map, boundaryId)) {
    return null;
  }
  console.log(`layer`);
  console.log(layer);
  const adminLevelDate = layer.requestBody?.Period || `0`;

  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={`layer-${layer.id}`}
      data={features}
      fillPaint={fillPaintData(layer)}
      fillOnClick={async (evt: any) => {
        addPopupParams(layer, dispatch, evt, t, true, adminLevelDate);
      }}
    />
  );
}

export default AdminLevelDataLayers;
