import { BoundaryLayerProps } from 'config/types';

import {
  getAdminDisplayLocationName,
  getLocalizedFullLocationName,
  localizeBoundaryRelationData,
  localizeName,
  usesAdminNameSidecar,
} from './admin-name-utils';

const layerWithSidecar = {
  adminLevelNames: ['adm0_name', 'adm1_name'],
  adminLevelLocalNames: ['adm0_local', 'adm1_local'],
  translationsPath: 'bundled:universal/translations/{scope}/{lang}.json',
} as BoundaryLayerProps;

const legacyLayer = {
  adminLevelNames: ['ADM1_EN', 'ADM2_EN'],
  adminLevelLocalNames: ['ADM1_FR', 'ADM2_FR'],
} as BoundaryLayerProps;

const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: {
    adm0_name: 'Mozambique',
    adm1_name: 'Cabo Delgado',
    adm0_local: 'Mozambique local',
    adm1_local: 'Cabo local',
    ADM1_EN: 'North',
    ADM2_EN: 'District A',
    ADM1_FR: 'Nord',
    ADM2_FR: 'District FR',
  },
} as GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

describe('admin-name-utils', () => {
  it('localizeName returns translated value or English fallback', () => {
    const dict = { Mozambique: 'Moçambique' };
    expect(localizeName('Mozambique', dict)).toBe('Moçambique');
    expect(localizeName('Unknown', dict)).toBe('Unknown');
    expect(localizeName('Mozambique')).toBe('Mozambique');
  });

  it('getLocalizedFullLocationName maps each level through the dict', () => {
    const dict = {
      Mozambique: 'Moçambique',
      'Cabo Delgado': 'Cab Delgado FR',
    };

    expect(
      getLocalizedFullLocationName(['adm0_name', 'adm1_name'], feature, dict),
    ).toBe('Moçambique, Cab Delgado FR');
  });

  it('usesAdminNameSidecar reflects translationsPath config', () => {
    expect(usesAdminNameSidecar(layerWithSidecar)).toBe(true);
    expect(usesAdminNameSidecar(legacyLayer)).toBe(false);
  });

  it('getAdminDisplayLocationName uses sidecar for supported languages', () => {
    const dict = { Mozambique: 'Moçambique' };

    expect(
      getAdminDisplayLocationName(
        layerWithSidecar,
        ['adm0_name'],
        feature,
        'fr',
        dict,
      ),
    ).toBe('Moçambique');
  });

  it('getAdminDisplayLocationName falls back to legacy local names without sidecar', () => {
    expect(
      getAdminDisplayLocationName(
        legacyLayer,
        ['ADM1_EN', 'ADM2_EN'],
        feature,
        'fr',
      ),
    ).toBe('Nord, District FR');
  });

  it('localizeBoundaryRelationData localizes relation names and children', () => {
    const englishRelations = {
      levels: [0, 1],
      relations: [
        {
          name: 'Mozambique',
          adminCode: 'MZ' as never,
          parent: '',
          level: 0 as never,
          children: ['Cabo Delgado'],
          bbox: [0, 0, 1, 1] as [number, number, number, number],
        },
        {
          name: 'Cabo Delgado',
          adminCode: 'MZ01' as never,
          parent: 'Mozambique',
          level: 1 as never,
          children: [],
          bbox: [0, 0, 1, 1] as [number, number, number, number],
        },
      ],
    };

    const localized = localizeBoundaryRelationData(englishRelations, {
      Mozambique: 'Moçambique',
      'Cabo Delgado': 'Cab Delgado FR',
    });

    expect(localized.relations[0].name).toBe('Moçambique');
    expect(localized.relations[0].children).toEqual(['Cab Delgado FR']);
    expect(localized.relations[1].parent).toBe('Moçambique');
  });
});
