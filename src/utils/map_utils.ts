import { Map as MapBoxMap } from 'mapbox-gl';

export function onlyBoundaryLayerOnPoint(
  map: MapBoxMap,
  point: [number, number],
) {
  const features = map.queryRenderedFeatures(point);
  // `layer-` is a prefix for all `layer` sources and consequently `id`
  // TODO: will have to use a constant instead e.g. NON_BOUNDARY_LAYER_PREFIX
  const nonBoundaryLayerFeatures = features.filter(f =>
    f.source.includes('layer-'),
  );
  return nonBoundaryLayerFeatures.length === 0;
}
