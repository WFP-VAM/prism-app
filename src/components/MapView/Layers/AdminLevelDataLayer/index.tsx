import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { get } from 'lodash';
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
import { addPopupData } from '../../../../context/tooltipStateSlice';
import { getFeatureInfoPropsData } from '../../utils';
import {
  getBoundaryLayers,
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../../config/utils';
import { addNotification } from '../../../../context/notificationStateSlice';
import { isLayerOnView } from '../../../../utils/map-utils';
import { getRoundedData } from '../../../../utils/data-utils';
import { useSafeTranslation } from '../../../../i18n';
import { fillPaintData } from '../styles';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const boundaryId = layer.boundary || getBoundaryLayerSingleton().id;

  const layerData = useSelector(layerDataSelector(layer.id)) as
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
      dispatch(loadLayerData({ layer }));
    }
  }, [dispatch, features, layer, boundaryId, map]);

  if (!features) {
    return null;
  }

  if (!isLayerOnView(map, boundaryId)) {
    return null;
  }

  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={`layer-${layer.id}`}
      data={features}
      fillPaint={fillPaintData(layer)}
      fillOnClick={async (evt: any) => {
        // by default add `data_field` to the tooltip
        dispatch(
          addPopupData({
            [layer.title]: {
              data: getRoundedData(get(evt.features[0], 'properties.data'), t),
              coordinates: evt.lngLat,
            },
          }),
        );
        // then add feature_info_props as extra fields to the tooltip
        dispatch(
          addPopupData(
            getFeatureInfoPropsData(layer.featureInfoProps || {}, evt),
          ),
        );
      }}
    />
  );
}

export default AdminLevelDataLayers;
