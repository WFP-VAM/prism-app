/**
 * Regression tests for the dashboard chart persistence/restore encoding in
 * multi-country (RBD) deployments.
 *
 * The bug: a country selection was persisted as "admin unit at level 1", so on
 * restore getProperties looked up the wrong admin level code, returned {}, and
 * the chart request went out with id_code=undefined. These tests lock in the
 * country (0) -> admin 1 (1) -> admin 2 (2) round trip.
 */
const ADMIN_LEVEL_CODES = ['admin0Pcod', 'admin1Pcod', 'admin2Pcod'];

// Force a multi-country deployment regardless of the test runner's COUNTRY.
jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    ...actual,
    appConfig: { ...actual.appConfig, multiCountry: true, countryAdmin0Id: '' },
  };
});
jest.mock('config/utils', () => ({
  ...jest.requireActual('config/utils'),
  getBoundaryLayersByAdminLevel: () => ({
    id: 'admin_boundaries',
    adminCode: 'admin2Pcod',
    adminLevelCodes: ADMIN_LEVEL_CODES,
    adminLevelNames: ['admin0Name', 'admin1Name', 'admin2Name'],
    adminLevelLocalNames: ['admin0Name', 'admin1Name', 'admin2Name'],
  }),
}));

import { AdminCodeString, AdminLevelType } from 'config/types';

import {
  adminUnitIdFromKeys,
  deriveAdminKeysFromProperties,
} from './chart-hooks';

const code = (v: string) => v as AdminCodeString;
const level = (v: number) => v as AdminLevelType;

describe('adminUnitIdFromKeys (multi-country)', () => {
  it('persists the country code at level 0', () => {
    expect(adminUnitIdFromKeys(code('ML'), code(''), code(''), level(0))).toBe(
      'ML',
    );
  });

  it('persists the admin 1 code at level 1', () => {
    expect(
      adminUnitIdFromKeys(code('ML'), code('ML07'), code(''), level(1)),
    ).toBe('ML07');
  });

  it('persists the admin 2 code at level 2', () => {
    expect(
      adminUnitIdFromKeys(code('ML'), code('ML07'), code('ML0701'), level(2)),
    ).toBe('ML0701');
  });
});

describe('deriveAdminKeysFromProperties (multi-country)', () => {
  it('restores the country at level 0', () => {
    expect(
      deriveAdminKeysFromProperties(
        { admin0Pcod: 'ML' },
        level(0),
        'ML',
        ADMIN_LEVEL_CODES,
      ),
    ).toEqual({ admin0Key: 'ML', admin1Key: '', admin2Key: '' });
  });

  it('restores the country + admin 1 at level 1', () => {
    expect(
      deriveAdminKeysFromProperties(
        { admin0Pcod: 'ML', admin1Pcod: 'ML07' },
        level(1),
        'ML07',
        ADMIN_LEVEL_CODES,
      ),
    ).toEqual({ admin0Key: 'ML', admin1Key: 'ML07', admin2Key: '' });
  });

  it('restores the full hierarchy at level 2', () => {
    expect(
      deriveAdminKeysFromProperties(
        { admin0Pcod: 'ML', admin1Pcod: 'ML07', admin2Pcod: 'ML0701' },
        level(2),
        'ML0701',
        ADMIN_LEVEL_CODES,
      ),
    ).toEqual({ admin0Key: 'ML', admin1Key: 'ML07', admin2Key: 'ML0701' });
  });
});

describe('persist -> restore round trip (multi-country)', () => {
  // The boundary feature getProperties would resolve for each saved code/level.
  const featureProps = {
    admin0Pcod: 'ML',
    admin1Pcod: 'ML07',
    admin2Pcod: 'ML0701',
  };

  it.each([
    [level(0), { admin0Key: 'ML', admin1Key: '', admin2Key: '' }],
    [level(1), { admin0Key: 'ML', admin1Key: 'ML07', admin2Key: '' }],
    [level(2), { admin0Key: 'ML', admin1Key: 'ML07', admin2Key: 'ML0701' }],
  ])('round-trips level %s without losing the country', (lvl, keys) => {
    const savedId = adminUnitIdFromKeys(
      code(keys.admin0Key),
      code(keys.admin1Key),
      code(keys.admin2Key),
      lvl,
    );

    // Country (level 0) must persist a non-empty id, otherwise restore can't
    // know which country was selected (the original id_code=undefined bug).
    expect(savedId).toBeTruthy();

    const restored = deriveAdminKeysFromProperties(
      featureProps,
      lvl,
      String(savedId),
      ADMIN_LEVEL_CODES,
    );

    expect(restored).toEqual(keys);
  });
});
