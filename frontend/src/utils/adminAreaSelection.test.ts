import { getAdminBoundaryTree } from 'components/MapView/Layers/BoundaryDropdown/utils';
import type { BoundaryLayerProps } from 'config/types';
import * as configUtils from 'config/utils';
import i18n from 'i18next';

import {
  adminAreaFilenameSegment,
  adminCodesEqual,
  buildCountryAdminFilenameStem,
  featureMatchesSelectedAdminCode,
  formatAdminAreaRefsForDisplay,
  normalizeAdminCode,
  resolveAdminAreaRefs,
  resolveFeaturesForAdminCodes,
  sanitizeFilenamePart,
} from './adminAreaSelection';

const layer = {
  adminCode: 'adm3_source_id',
  adminLevelCodes: ['adm1_source_id', 'adm2_source_id', 'adm3_source_id'],
  adminLevelNames: ['adm1_name', 'adm2_name', 'adm3_name'],
  adminLevelLocalNames: ['adm1_name', 'adm2_name', 'adm3_name'],
} as BoundaryLayerProps;

describe('featureMatchesSelectedAdminCode', () => {
  test('matches a parent code via an intermediate admin level property', () => {
    expect(
      featureMatchesSelectedAdminCode(
        {
          adm1_source_id: 'MZ11',
          adm2_source_id: 'MZ1101',
          adm3_source_id: 'MZ110101',
        },
        layer,
        'MZ11' as never,
      ),
    ).toBe(true);
  });

  test('matches a leaf code exactly', () => {
    expect(
      featureMatchesSelectedAdminCode(
        {
          adm1_source_id: 'MZ11',
          adm3_source_id: 'MZ110101',
        },
        layer,
        'MZ110101' as never,
      ),
    ).toBe(true);
  });
});

describe('resolveAdminAreaRefs', () => {
  test('resolves the first province in the tree (not dropped by slice)', () => {
    const data = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            adm1_source_id: 'MZ01',
            adm1_name: 'Cabo Delgado',
            adm2_source_id: 'MZ0101',
            adm2_name: 'District A',
            adm3_source_id: 'MZ010101',
            adm3_name: 'Post A',
          },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
        {
          type: 'Feature',
          properties: {
            adm1_source_id: 'MZ02',
            adm1_name: 'Gaza',
            adm2_source_id: 'MZ0201',
            adm2_name: 'District B',
            adm3_source_id: 'MZ020101',
            adm3_name: 'Post B',
          },
          geometry: { type: 'Point', coordinates: [1, 1] },
        },
      ],
    };

    const tree = getAdminBoundaryTree(data as never, layer, i18n);
    const firstProvinceCode = Object.values(tree.children)[0]?.adminCode;

    expect(firstProvinceCode).toBe('MZ01');
    expect(
      resolveAdminAreaRefs(['MZ01' as never], data as never, layer, i18n),
    ).toEqual([{ area_id: 'MZ01', name: 'Cabo Delgado' }]);
  });
});

describe('admin code normalization', () => {
  test('treats numeric and string boundary IDs as equal', () => {
    expect(adminCodesEqual(4, '4')).toBe(true);
    expect(normalizeAdminCode(4)).toBe('4');
  });
});

describe('resolveFeaturesForAdminCodes', () => {
  const treeLayer = {
    id: 'admin_boundaries',
    adminCode: 'leaf_code',
    adminLevelCodes: ['parent_code', 'mid_code', 'leaf_code'],
    adminLevelNames: ['parent_n', 'mid_n', 'leaf_n'],
    adminLevelLocalNames: ['parent_n', 'mid_n', 'leaf_n'],
  } as BoundaryLayerProps;

  const treeData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          parent_n: 'Northern',
          parent_code: 4,
          mid_n: 'Jaffna',
          mid_code: '41',
          leaf_n: 'Jaffna',
          leaf_code: '4101',
        },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ],
  };

  const admin1Data = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { parent_n: 'Northern', parent_code: 4 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
    ],
  };

  test('resolves parent-level polygons when tree stores numeric IDs', () => {
    jest.spyOn(configUtils, 'getBoundaryLayers').mockReturnValue([
      {
        id: 'admin1_boundaries',
        type: 'boundary',
        adminCode: 'parent_code',
        adminLevelCodes: ['parent_code'],
        adminLevelNames: ['parent_n'],
        adminLevelLocalNames: ['parent_n'],
      } as BoundaryLayerProps,
    ]);

    const features = resolveFeaturesForAdminCodes(
      ['4' as never],
      treeData as never,
      treeLayer,
      i18n,
      layerId =>
        layerId === 'admin1_boundaries' ? (admin1Data as never) : undefined,
    );

    expect(features).toHaveLength(1);
    expect(features[0].properties?.parent_code).toBe(4);
  });

  test('returns all PMTiles fragments for the same admin code', () => {
    jest.spyOn(configUtils, 'getBoundaryLayers').mockReturnValue([
      {
        id: 'universal_admin1_boundaries',
        type: 'boundary',
        format: 'pmtiles',
        adminCode: 'parent_code',
        adminLevelCodes: ['parent_code'],
        adminLevelNames: ['parent_n'],
        adminLevelLocalNames: ['parent_n'],
      } as BoundaryLayerProps,
    ]);

    const pmtilesData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { parent_code: 4 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0.5, 0],
                [0.5, 0.5],
                [0, 0.5],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { parent_code: 4 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0.5, 0],
                [1, 0],
                [1, 0.5],
                [0.5, 0.5],
                [0.5, 0],
              ],
            ],
          },
        },
      ],
    };

    const features = resolveFeaturesForAdminCodes(
      ['4' as never],
      treeData as never,
      treeLayer,
      i18n,
      layerId =>
        layerId === 'universal_admin1_boundaries'
          ? (pmtilesData as never)
          : undefined,
    );

    expect(features).toHaveLength(2);
  });
});

describe('export filename helpers', () => {
  test('builds country_area stem for masked exports', () => {
    expect(
      buildCountryAdminFilenameStem('mozambique', [
        { area_id: 'MZ01', name: 'Cabo Delgado' },
      ]),
    ).toBe('mozambique_Cabo_Delgado');
  });

  test('joins multiple admin area names with underscores', () => {
    expect(
      adminAreaFilenameSegment([
        { area_id: 'MZ01', name: 'Cabo Delgado' },
        { area_id: 'MZ02', name: 'Gaza' },
      ]),
    ).toBe('Cabo_Delgado_Gaza');
  });

  test('sanitizes unsafe filename characters', () => {
    expect(sanitizeFilenamePart('Bad/name?')).toBe('Bad_name');
  });
});

describe('formatAdminAreaRefsForDisplay', () => {
  test('joins display names for admin console', () => {
    expect(
      formatAdminAreaRefsForDisplay([
        { area_id: 'MZ11', name: 'Zambezia' },
        { area_id: 'MZ03', name: 'Maputo' },
      ]),
    ).toBe('Zambezia, Maputo');
  });
});
