import type { BoundaryLayerProps } from 'config/types';

import {
  featureMatchesSelectedAdminCode,
  formatAdminAreaRefsForDisplay,
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
