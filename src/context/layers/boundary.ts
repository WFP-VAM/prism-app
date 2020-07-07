import { FeatureCollection } from 'geojson';
// eslint-disable-next-line import/no-cycle
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
