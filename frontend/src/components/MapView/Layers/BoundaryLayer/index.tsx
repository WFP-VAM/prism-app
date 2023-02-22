import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import {
  showPopup,
  hidePopup,
  fetchPopupData,
} from '../../../../context/tooltipStateSlice';
import { BoundaryLayerProps, WMSLayerProps } from '../../../../config/types';
import { LayerData } from '../../../../context/layers/layer-data';
import {
  setBoundaryParams,
  setDatasetTitle,
  setDatasetChartType,
} from '../../../../context/datasetStateSlice';

import {
  layerDataSelector,
  layersSelector,
} from '../../../../context/mapStateSlice/selectors';
import { toggleSelectedBoundary } from '../../../../context/mapSelectionLayerStateSlice';
import { isPrimaryBoundaryLayer } from '../../../../config/utils';
import { getFullLocationName } from '../../../../utils/name-utils';

import { getChartAdminBoundaryParams } from '../../../../utils/admin-utils';
import { useSafeTranslation } from '../../../../i18n';

function onToggleHover(cursor: string, targetMap: MapboxGL.Map) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

interface ComponentProps {
  layer: BoundaryLayerProps;
  before?: string;
}

function BoundaryLayer({ layer, before }: ComponentProps) {
  const dispatch = useDispatch();
  const selectedLayers = useSelector(layersSelector);
  const { i18n } = useSafeTranslation();

  const boundaryLayer = useSelector(layerDataSelector(layer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayer || {};

  if (!data) {
    return null; // boundary layer hasn't loaded yet. We load it on init inside MapView. We can't load it here since its a dependency of other layers.
  }

  const isPrimaryLayer = isPrimaryBoundaryLayer(layer);

  const onClickShowPopup = (evt: any) => {
    dispatch(hidePopup());
    const coordinates = evt.lngLat;
    const locationName = getFullLocationName(
      layer.adminLevelNames,
      evt.features[0],
    );

    const locationLocalName = getFullLocationName(
      layer.adminLevelLocalNames,
      evt.features[0],
    );

    dispatch(showPopup({ coordinates, locationName, locationLocalName }));

    // get the second layer popup_url because the first layers would always be the boundary layer
    const { popupUrl } = selectedLayers[1];
    if (popupUrl) {
      const url = new URL(popupUrl);
      const locationCode = evt.features[0].properties[layer.adminCode];
      url.searchParams.set('lon', coordinates.lng.toString());
      url.searchParams.set('lat', coordinates.lat.toString());
      url.searchParams.set('language', i18n.resolvedLanguage);
      url.searchParams.set('areacode', locationCode);
      dispatch(fetchPopupData(url.toString()));
    }
  };

  const onClickFunc = (evt: any) => {
    const { properties } = evt.features[0];

    // send the selection to the map selection layer. No-op if selection mode isn't on.
    dispatch(
      toggleSelectedBoundary(evt.features[0].properties[layer.adminCode]),
    );

    onClickShowPopup(evt);

    const selectedLayerWMS: undefined | WMSLayerProps = selectedLayers.find(
      l => l.type === 'wms' && l.chartData,
    ) as WMSLayerProps;

    if (!selectedLayerWMS) {
      return;
    }

    dispatch(setDatasetTitle(selectedLayerWMS.title));
    dispatch(setDatasetChartType(selectedLayerWMS.chartData!.type));

    const adminBoundaryParams = getChartAdminBoundaryParams(
      selectedLayerWMS,
      properties,
    );

    dispatch(setBoundaryParams(adminBoundaryParams));
  };

  // Only use mouse effects and click effects on the main layer.
  const { fillOnMouseEnter, fillOnMouseLeave, fillOnClick } = isPrimaryLayer
    ? {
        fillOnMouseEnter: (evt: any) => onToggleHover('pointer', evt.target),
        fillOnMouseLeave: (evt: any) => onToggleHover('', evt.target),
        fillOnClick: onClickFunc,
      }
    : {
        fillOnMouseEnter: undefined,
        fillOnMouseLeave: undefined,
        fillOnClick: undefined,
      };

  return (
    <GeoJSONLayer
      id={`layer-${layer.id}`}
      data={data}
      fillPaint={layer.styles.fill}
      linePaint={layer.styles.line}
      fillOnMouseEnter={fillOnMouseEnter}
      fillOnMouseLeave={fillOnMouseLeave}
      fillOnClick={fillOnClick}
      before={before}
    />
  );
}

export default BoundaryLayer;
