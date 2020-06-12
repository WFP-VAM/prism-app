import { FeatureCollection } from 'geojson';
import { isNull, isString } from 'lodash';
import { LayerDataParams } from './layer-data';
import { BoundaryLayerProps, NSOLayerProps } from '../../config/types';

import adminBoundariesRaw from '../../../public/data/admin_boundaries.json';

const adminBoundaries = adminBoundariesRaw as FeatureCollection;

export interface BoundaryLayerData extends FeatureCollection {}

export async function fetchBoundaryLayerData(
  params: LayerDataParams<BoundaryLayerProps>,
) {
  const { layer } = params;
  const { path } = layer;

  return adminBoundaries;
}
