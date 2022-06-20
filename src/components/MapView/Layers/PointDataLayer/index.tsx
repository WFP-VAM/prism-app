import React, { useEffect } from 'react';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { PointDataLayerProps, PointDataLoader } from '../../../../config/types';
import { addPopupData } from '../../../../context/tooltipStateSlice';
import { koboAuthParamsSelector } from '../../../../context/serverStateSlice';
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
import {
  setEWSParams,
  clearDataset,
} from '../../../../context/datasetStateSlice';
import { createEWSDatasetParams } from '../../../../utils/ews-utils';

// Point Data, takes any GeoJSON of points and shows it.
function PointDataLayer({ layer }: { layer: PointDataLayerProps }) {
  const selectedDate = useDefaultDate(layer.id);
  const koboAuthParams = useSelector(koboAuthParamsSelector);

  const layerData = useSelector(layerDataSelector(layer.id, selectedDate)) as
    | LayerData<PointDataLayerProps>
    | undefined;
  const dispatch = useDispatch();

  const { data } = layerData || {};
  const { features } = data || {};
  const { t } = useSafeTranslation();
  useEffect(() => {
    if (
      !features &&
      ((layer.tokenRequired && koboAuthParams) || !layer.tokenRequired)
    ) {
      dispatch(loadLayerData({ layer, date: selectedDate, koboAuthParams }));
    }
  }, [features, dispatch, layer, selectedDate, koboAuthParams]);

  if (!features) {
    return null;
  }

  const onClickFunc = async (evt: any) => {
    const feature = evt.features[0];

    // by default add `dataField` to the tooltip
    dispatch(
      addPopupData({
        [layer.title]: {
          data: getRoundedData(
            get(feature, `properties.${layer.dataField}`),
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

    if (layer.loader === PointDataLoader.EWS && selectedDate) {
      dispatch(clearDataset());

      const ewsDatasetParams = createEWSDatasetParams(
        feature?.properties,
        layer.data,
      );
      dispatch(setEWSParams(ewsDatasetParams));
    }
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
