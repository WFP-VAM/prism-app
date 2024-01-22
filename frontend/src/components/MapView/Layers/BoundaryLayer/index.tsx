import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BoundaryLayerProps, MapEventWrapFunctionProps } from 'config/types';
import { LayerData } from 'context/layers/layer-data';
import { showPopup } from 'context/tooltipStateSlice';
import { Source, Layer, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { setBoundaryRelationData } from 'context/mapStateSlice';
import {
  loadBoundaryRelations,
  BoundaryRelationData,
} from 'components/Common/BoundaryDropdown/utils';
import { isPrimaryBoundaryLayer } from 'config/utils';
import { toggleSelectedBoundary } from 'context/mapSelectionLayerStateSlice';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { getFullLocationName } from 'utils/name-utils';

import { languages } from 'i18n';
import { Map as MaplibreMap } from 'maplibre-gl';
import { getLayerMapId } from 'utils/map-utils';

function onToggleHover(cursor: string, targetMap: MaplibreMap) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

interface ComponentProps {
  layer: BoundaryLayerProps;
  before?: string;
}

export const getLayersIds = (layer: BoundaryLayerProps) => [
  getLayerMapId(layer.id, 'fill'),
];

export const onClick = ({
  dispatch,
  layer,
  t,
}: MapEventWrapFunctionProps<BoundaryLayerProps>) => (
  evt: MapLayerMouseEvent,
) => {
  const isPrimaryLayer = isPrimaryBoundaryLayer(layer);
  if (!isPrimaryLayer) {
    return;
  }

  const layerId = getLayerMapId(layer.id, 'fill');

  // TODO: maplibre: fix feature
  const feature = evt.features?.find((x: any) => x.layer.id === layerId) as any;
  if (!feature) {
    return;
  }

  // send the selection to the map selection layer. No-op if selection mode isn't on.
  dispatch(toggleSelectedBoundary(feature.properties[layer.adminCode]));

  const coordinates = [evt.lngLat.lng, evt.lngLat.lat];
  const locationSelectorKey = layer.adminCode;
  const locationAdminCode = feature.properties[layer.adminCode];
  const locationName = getFullLocationName(layer.adminLevelNames, feature);

  const locationLocalName = getFullLocationName(
    layer.adminLevelLocalNames,
    feature,
  );

  dispatch(
    showPopup({
      coordinates,
      locationSelectorKey,
      locationAdminCode,
      locationName,
      locationLocalName,
    }),
  );
};

export const onMouseEnter = ({
  layer,
}: MapEventWrapFunctionProps<BoundaryLayerProps>) => (
  evt: MapLayerMouseEvent,
) => isPrimaryBoundaryLayer(layer) && onToggleHover('pointer', evt.target);
export const onMouseLeave = ({
  layer,
}: MapEventWrapFunctionProps<BoundaryLayerProps>) => (
  evt: MapLayerMouseEvent,
) => isPrimaryBoundaryLayer(layer) && onToggleHover('', evt.target);

const BoundaryLayer = ({ layer, before }: ComponentProps) => {
  const dispatch = useDispatch();

  const boundaryLayer = useSelector(layerDataSelector(layer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayer || {};

  const isPrimaryLayer = isPrimaryBoundaryLayer(layer);

  useEffect(() => {
    if (!data || !isPrimaryLayer) {
      return;
    }

    const dataDict = languages.reduce((relationsDict, lang) => {
      const locationLevelNames =
        lang === 'en' ? layer.adminLevelNames : layer.adminLevelLocalNames;

      const relations: BoundaryRelationData = loadBoundaryRelations(
        data,
        locationLevelNames,
        layer,
      );

      return { ...relationsDict, [lang]: relations };
    }, {});

    dispatch(setBoundaryRelationData(dataDict));
  }, [data, dispatch, layer, isPrimaryLayer]);

  if (!data) {
    return null; // boundary layer hasn't loaded yet. We load it on init inside MapView. We can't load it here since its a dependency of other layers.
  }

  // We need 2 layers here since react-map-gl does not support styling "line" for "fill" typed layers
  return (
    <Source type="geojson" data={data}>
      <Layer
        id={getLayerMapId(layer.id)}
        type="line"
        paint={layer.styles.line}
        beforeId={before}
      />
      <Layer
        id={getLayerMapId(layer.id, 'fill')}
        type="fill"
        paint={layer.styles.fill}
        beforeId={before}
      />
    </Source>
  );
};

export default memo(BoundaryLayer);
