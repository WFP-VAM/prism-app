import { AdminCodeString, BoundaryLayerProps, LayerKey } from 'config/types';
import { BoundaryLayerData } from 'context/layers/boundary';

import { getGoToBounds } from './goto-utils';
import { FlattenedAdminBoundary } from './utils';

const admin0Layer = {
  id: 'universal_admin0_boundaries' as LayerKey,
  adminCode: 'adm0_id' as AdminCodeString,
  adminLevelCodes: ['adm0_id'] as AdminCodeString[],
} as BoundaryLayerProps;

const admin1Layer = {
  id: 'universal_admin1_boundaries' as LayerKey,
  adminCode: 'adm1_id' as AdminCodeString,
  adminLevelCodes: ['adm0_id', 'adm1_id'] as AdminCodeString[],
} as BoundaryLayerProps;

const admin2Layer = {
  id: 'universal_admin2_boundaries' as LayerKey,
  adminCode: 'adm2_id' as AdminCodeString,
  adminLevelCodes: ['adm0_id', 'adm1_id', 'adm2_id'] as AdminCodeString[],
} as BoundaryLayerProps;

const boundaryLayers = [admin2Layer, admin1Layer, admin0Layer];

function area(
  adminCode: string,
  level: number,
  iso3?: string,
): FlattenedAdminBoundary {
  return {
    adminCode: adminCode as AdminCodeString,
    key: adminCode as AdminCodeString,
    label: adminCode,
    level: level as FlattenedAdminBoundary['level'],
    iso3,
  };
}

function polygonFeature(
  properties: Record<string, unknown>,
  west: number,
  south: number,
  east: number,
  north: number,
) {
  return {
    type: 'Feature' as const,
    properties,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}

describe('getGoToBounds', () => {
  it.each([
    ['1', 'AFG', [60.5176, 29.3772, 74.8899, 38.4896]],
    ['102', 'xAB', [27.8333, 9.3432, 29, 10.1672]],
    ['27', 'BEL', [2.5454, 49.4972, 6.4075, 51.5051]],
    ['31', 'BTN', [88.7465, 26.702, 92.1246, 28.247]],
    ['236', 'SWE', [10.9867, 55.3371, 24.1633, 69.0602]],
  ])(
    'uses complete metadata bounds for admin0 code %s',
    (code, iso3, expected) => {
      const bounds = getGoToBounds(
        area(code, 1, iso3),
        admin2Layer,
        boundaryLayers,
        {} as Record<LayerKey, BoundaryLayerData | undefined>,
      );

      expect(bounds).toEqual(expected);
    },
  );

  it('matches the selected level exactly instead of using foreign prefixes', () => {
    const boundaryData = {
      [admin0Layer.id]: {
        type: 'FeatureCollection',
        features: [],
      },
      [admin1Layer.id]: {
        type: 'FeatureCollection',
        features: [
          polygonFeature({ adm1_id: 27 }, 10, 10, 11, 11),
          polygonFeature({ adm1_id: 270 }, 40, 40, 41, 41),
        ],
      },
      [admin2Layer.id]: {
        type: 'FeatureCollection',
        features: [
          polygonFeature({ adm2_id: 27 }, 20, 20, 21, 21),
          polygonFeature({ adm2_id: 2700 }, 80, 80, 81, 81),
        ],
      },
    } as Record<LayerKey, BoundaryLayerData | undefined>;

    expect(
      getGoToBounds(area('27', 2), admin2Layer, boundaryLayers, boundaryData),
    ).toEqual([10, 10, 11, 11]);
  });

  it('returns undefined when the owning layer has no exact match', () => {
    const boundaryData = {
      [admin1Layer.id]: {
        type: 'FeatureCollection',
        features: [polygonFeature({ adm1_id: 270 }, 40, 40, 41, 41)],
      },
    } as Record<LayerKey, BoundaryLayerData | undefined>;

    expect(
      getGoToBounds(area('27', 2), admin2Layer, boundaryLayers, boundaryData),
    ).toBeUndefined();
  });
});
