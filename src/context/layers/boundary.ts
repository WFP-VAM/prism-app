import { FeatureCollection } from 'geojson';
import { LayerDataParams } from './layer-data';
import { BoundaryLayerProps } from '../../config/types';

export interface BoundaryLayerData extends FeatureCollection {}

export async function fetchBoundaryLayerData(
  params: LayerDataParams<BoundaryLayerProps>,
) {
  const { layer } = params;
  const { path } = layer;

  return (await fetch(path)).json();
}
