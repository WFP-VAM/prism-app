import { getAdminBoundaryTree } from 'components/MapView/Layers/BoundaryDropdown/utils';
import type { BoundaryLayerProps } from 'config/types';
import i18n from 'i18next';

import {
  featureMatchesSelectedAdminCode,
  formatAdminAreaRefsForDisplay,
  resolveAdminAreaRefs,
} from './adminAreaSelection';

const layer = {
  adminCode: 'adm3_source_id',
  adminLevelCodes: ['adm1_source_id', 'adm2_source_id', 'adm3_source_id'],
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
    const layer = {
      adminCode: 'adm3_source_id',
      adminLevelCodes: ['adm1_source_id', 'adm2_source_id', 'adm3_source_id'],
      adminLevelNames: ['adm1_name', 'adm2_name', 'adm3_name'],
      adminLevelLocalNames: ['adm1_name', 'adm2_name', 'adm3_name'],
    } as BoundaryLayerProps;

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
