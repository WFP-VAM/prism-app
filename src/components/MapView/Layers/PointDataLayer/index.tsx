import React, { useEffect } from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { PointDataLayerProps } from '../../../../config/types';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getFeatureInfoPropsData } from '../../utils';
import { getBoundaryLayerSingleton } from '../../../../config/utils';
import { getRoundedData } from '../../../../utils/data-utils';
import { useSafeTranslation } from '../../../../i18n';
import { circleLayout, circlePaint, fillPaintData } from '../styles';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);

  const layerData = useSelector(layerDataSelector(layer.id, selectedDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};
  const { features } = data || {};
  const { t } = useSafeTranslation();
  useEffect(() => {
    if (!features) {
      dispatch(loadLayerData({ layer, date: selectedDate }));
    }
  }, [features, dispatch, layer, selectedDate]);

  if (!features) {
    return null;
  }

  const onClickFunc = async (evt: any) => {
    // by default add `dataField` to the tooltip
    dispatch(
      addPopupData({
        [layer.title]: {
          data: getRoundedData(
            get(evt.features[0], `properties.${layer.dataField}`),
            t,
          ),
          coordinates: evt.lngLat,
        },
      }),
    );
    // then add feature_info_props as extra fields to the tooltip
    dispatch(
      addPopupData(getFeatureInfoPropsData(layer.featureInfoProps || {}, evt)),
    );
  };

  const boundaryId = getBoundaryLayerSingleton().id;

  if (layer.adminLevelDisplay) {
    return (
      <GeoJSONLayer
        before={`layer-${boundaryId}-line`}
        id={`layer-${layer.id}`}
        data={features}
        fillPaint={fillPaintData(layer, layer.dataField)}
        fillOnClick={onClickFunc}
      />
    );
  }
  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={`layer-${layer.id}`}
      data={features}
      circleLayout={circleLayout}
      circlePaint={circlePaint(layer, layer.dataField)}
      circleOnClick={onClickFunc}
    />
  );
}

export default PointDataLayer;
