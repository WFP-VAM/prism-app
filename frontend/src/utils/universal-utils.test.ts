import {
  getCountryBbox,
  getDisplayBoundaryLayersForIso3,
  hasAdmin3ForCountry,
  isKnownIso3,
  isValidIso3Format,
  normalizeIso3,
  resolveChartBoundaryProperty,
} from './universal-utils';

describe('universal-utils', () => {
  it('normalizes iso3 codes', () => {
    expect(normalizeIso3('moz')).toBe('MOZ');
    expect(normalizeIso3(' ITA ')).toBe('ITA');
  });

  it('validates iso3 format', () => {
    expect(isValidIso3Format('MOZ')).toBe(true);
    expect(isValidIso3Format(normalizeIso3('moz'))).toBe(true);
    expect(isValidIso3Format(normalizeIso3('Moz'))).toBe(true);
    expect(isValidIso3Format('MO')).toBe(false);
    expect(isValidIso3Format('MOZ4')).toBe(false);
  });

  it('recognizes known iso3 codes from metadata', () => {
    expect(isKnownIso3('MOZ')).toBe(true);
    expect(isKnownIso3('QQQ')).toBe(false);
  });

  it('detects admin3 availability for Mozambique', () => {
    expect(hasAdmin3ForCountry('MOZ')).toBe(true);
    expect(hasAdmin3ForCountry('ITA')).toBe(false);
  });

  it('filters admin3 boundary layer when unavailable for universal deployment', () => {
    if (process.env.REACT_APP_COUNTRY !== 'universal') {
      return;
    }
    const withAdmin3 = getDisplayBoundaryLayersForIso3('MOZ');
    const withoutAdmin3 = getDisplayBoundaryLayersForIso3('ITA');
    expect(
      withAdmin3.some(layer => layer.id === 'universal_admin3_boundaries'),
    ).toBe(true);
    expect(
      withoutAdmin3.some(layer => layer.id === 'universal_admin3_boundaries'),
    ).toBe(false);
  });

  it('returns pre-computed bbox for known countries', () => {
    const bbox = getCountryBbox('MOZ');
    expect(bbox).toBeDefined();
    expect(bbox).toHaveLength(4);
    expect(bbox![0]).toBeLessThan(bbox![2]);
    expect(bbox![1]).toBeLessThan(bbox![3]);
  });

  it('returns undefined bbox for unknown countries', () => {
    expect(getCountryBbox('QQQ')).toBeUndefined();
    expect(getCountryBbox(undefined)).toBeUndefined();
  });

  it('maps dv_adm chart keys to adm boundary properties in universal mode', () => {
    if (process.env.REACT_APP_COUNTRY !== 'universal') {
      return;
    }
    const properties = { adm0_id: 42, adm1_id: 420, adm1_name: 'Test' };
    expect(resolveChartBoundaryProperty(properties, 'dv_adm0_id')).toBe(42);
    expect(resolveChartBoundaryProperty(properties, 'dv_adm1_id')).toBe(420);
    expect(resolveChartBoundaryProperty(properties, 'dv_adm1_name')).toBe(
      'Test',
    );
  });
});
