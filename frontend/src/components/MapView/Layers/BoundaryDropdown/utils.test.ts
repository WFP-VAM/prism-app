import { AdminCodeString, BoundaryLayerProps } from 'config/types';
import i18n from 'i18next';
import { isAdminNameSentinel } from 'utils/admin-name-utils';

import { flattenAreaTree, getAdminBoundaryTree } from './utils';

const mockLayer = {
  id: 'test_boundary',
  adminCode: 'adm2_id' as AdminCodeString,
  adminLevelCodes: ['adm0_id', 'adm1_id', 'adm2_id'] as AdminCodeString[],
  adminLevelNames: ['adm0_name', 'adm1_name', 'adm2_name'],
  adminLevelLocalNames: ['adm0_name', 'adm1_name', 'adm2_name'],
} as BoundaryLayerProps;

const mockI18n = {
  language: 'en',
  resolvedLanguage: 'en',
} as typeof i18n;

describe('isAdminNameSentinel', () => {
  it('detects known sentinel values case-insensitively', () => {
    expect(isAdminNameSentinel('N/A')).toBe(true);
    expect(isAdminNameSentinel('n/a')).toBe(true);
    expect(isAdminNameSentinel('  N/A  ')).toBe(true);
    expect(isAdminNameSentinel('Name Unknown')).toBe(true);
    expect(isAdminNameSentinel('Administrative unit not available')).toBe(true);
    expect(isAdminNameSentinel('????')).toBe(true);
  });

  it('returns false for real names and empty values', () => {
    expect(isAdminNameSentinel('Badakhshan')).toBe(false);
    expect(isAdminNameSentinel('Abyei')).toBe(false);
    expect(isAdminNameSentinel('')).toBe(false);
    expect(isAdminNameSentinel(undefined)).toBe(false);
  });
});

describe('getAdminBoundaryTree sentinel filtering', () => {
  it('excludes branches whose English admin name is a sentinel', () => {
    const data = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {
            iso3: 'AFG',
            adm0_id: 'AFG',
            adm0_name: 'Afghanistan',
            adm1_id: 'AFG01',
            adm1_name: 'Badakhshan',
            adm2_id: 'AFG0101',
            adm2_name: 'Arghanj Khwa',
          },
          geometry: null,
        },
        {
          type: 'Feature' as const,
          properties: {
            adm0_id: 'xAB',
            adm0_name: 'Abyei',
            adm1_id: 'xAB01',
            adm1_name: 'N/A',
            adm2_id: 'xAB0101',
            adm2_name: 'N/A',
          },
          geometry: null,
        },
        {
          type: 'Feature' as const,
          properties: {
            adm0_id: 'VAT',
            adm0_name: 'Holy See',
            adm1_id: 'VAT01',
            adm1_name: '????',
            adm2_id: 'VAT0101',
            adm2_name: 'Name Unknown',
          },
          geometry: null,
        },
      ],
    };

    const tree = getAdminBoundaryTree(data, mockLayer, mockI18n);
    const flat = flattenAreaTree(tree);
    const labels = flat.map(area => area.label);

    expect(labels).toContain('Afghanistan');
    expect(labels).toContain('Badakhshan');
    expect(labels).toContain('Arghanj Khwa');
    expect(labels).toContain('Abyei');
    expect(labels).toContain('Holy See');
    expect(labels).not.toContain('N/A');
    expect(labels).not.toContain('????');
    expect(labels).not.toContain('Name Unknown');
    expect(flat.find(area => area.label === 'Afghanistan')?.iso3).toBe('AFG');
  });

  it('filters sentinels using the raw English name even when localized', () => {
    const layerWithSidecar = {
      ...mockLayer,
      translationsPath: 'bundled:universal/translations/{scope}/{lang}.json',
    } as BoundaryLayerProps;

    const spanishI18n = {
      language: 'es',
      resolvedLanguage: 'es',
    } as typeof i18n;

    const data = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {
            adm0_id: 'xAB',
            adm0_name: 'Abyei',
            adm1_id: 'xAB01',
            adm1_name: 'N/A',
          },
          geometry: null,
        },
      ],
    };

    // Sidecar would normally map "N/A" → "Abyei" (or similar); filtering
    // must still reject based on the English key before localization.
    const tree = getAdminBoundaryTree(data, layerWithSidecar, spanishI18n, {
      'N/A': 'Abyei',
      Abyei: 'Abyei',
    });
    const flat = flattenAreaTree(tree);
    const labels = flat.map(area => area.label);

    expect(labels).toEqual(['Abyei']);
  });

  it('localizes admin2-style Go To labels from the sidecar dict', () => {
    const admin2Layer = {
      ...mockLayer,
      translationsPath: 'bundled:universal/translations/{scope}/{lang}.json',
    } as BoundaryLayerProps;

    const frenchI18n = {
      language: 'fr',
      resolvedLanguage: 'fr',
    } as typeof i18n;

    const data = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {
            adm0_id: 'ETH',
            adm0_name: 'Ethiopia',
            adm1_id: 'ETH01',
            adm1_name: 'Tigray',
            adm2_id: 'ETH0101',
            adm2_name: 'Central Gondar',
          },
          geometry: null,
        },
      ],
    };

    const tree = getAdminBoundaryTree(data, admin2Layer, frenchI18n, {
      Ethiopia: 'Éthiopie',
      Tigray: 'Tigré',
      'Central Gondar': 'Nord Gondar',
    });
    const labels = flattenAreaTree(tree).map(area => area.label);

    expect(labels).toEqual(['Éthiopie', 'Tigré', 'Nord Gondar']);
  });

  it('localizes labels from a provided dict even without translationsPath', () => {
    const frenchI18n = {
      language: 'fr',
      resolvedLanguage: 'fr',
    } as typeof i18n;

    const data = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {
            adm0_id: 'ETH',
            adm0_name: 'Ethiopia',
            adm1_id: 'ETH01',
            adm1_name: 'Tigray',
            adm2_id: 'ETH0101',
            adm2_name: 'Central Gondar',
          },
          geometry: null,
        },
      ],
    };

    const tree = getAdminBoundaryTree(data, mockLayer, frenchI18n, {
      Ethiopia: 'Éthiopie',
      Tigray: 'Tigré',
      'Central Gondar': 'Nord Gondar',
    });
    const labels = flattenAreaTree(tree).map(area => area.label);

    expect(labels).toEqual(['Éthiopie', 'Tigré', 'Nord Gondar']);
  });
});
