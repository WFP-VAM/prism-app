import { memo, useEffect } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { useDispatch, useSelector } from 'context/hooks';
import { GeojsonDataLayerProps, LegendDefinition } from 'config/types';

import { LayerData, loadLayerData } from 'context/layers/layer-data';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { getLayerMapId } from 'utils/map-utils';
import { opacitySelector } from 'context/opacityStateSlice';
import { FillLayerSpecification } from 'maplibre-gl';

const paintProps: (
  legend: LegendDefinition,
  opacity: number | undefined,
) => FillLayerSpecification['paint'] = (
  legend: LegendDefinition,
  opacity?: number,
) => ({
  'fill-opacity': opacity || 1,
  'fill-color': {
    property: 'level',
    type: 'categorical',
    stops: legend.map(({ value, color }) => [value, color]),
  },
});

// Polygon Data, takes any GeoJSON of polygons and shows it.
const GeojsonDataLayer = memo(({ layer, before }: LayersProps) => {
  const dispatch = useDispatch();
  const layerId = getLayerMapId(layer.id);
  const opacityState = useSelector(opacitySelector(layer.id));

  const layerData = useSelector(layerDataSelector(layer.id)) as
    | LayerData<GeojsonDataLayerProps>
    | undefined;

  const { data } = layerData || {};

  useEffect(() => {
    dispatch(loadLayerData({ layer }));
  }, [dispatch, layer]);

  if (!data) {
    return null;
  }

  return (
    <Source data={data} type="geojson">
      <Layer
        beforeId={before}
        id={layerId}
        type="fill"
        paint={paintProps(layer.legend || [], opacityState || layer.opacity)}
      />
    </Source>
  );
});

export interface LayersProps {
  layer: GeojsonDataLayerProps;
  before?: string;
}

export default GeojsonDataLayer;
