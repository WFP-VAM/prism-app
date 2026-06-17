import {
  getCountryBbox,
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

  it('returns pre-computed bbox for known countries', () => {
    const bbox = getCountryBbox('MOZ');
    expect(bbox).toBeDefined();
    expect(bbox).toHaveLength(4);
    expect(bbox![0]).toBeLessThan(bbox![2]);
    expect(bbox![1]).toBeLessThan(bbox![3]);
  });

  it('returns a fitBounds-safe bbox for USA', () => {
    const bbox = getCountryBbox('USA');
    expect(bbox).toEqual([-179.1489, 18.9104, -65.0, 71.3652]);
    expect(bbox![2] - bbox![0]).toBeLessThanOrEqual(180);
  });

  it('returns undefined bbox for unknown countries', () => {
    expect(getCountryBbox('QQQ')).toBeUndefined();
    expect(getCountryBbox(undefined)).toBeUndefined();
  });

  it('returns dv_adm id when present on feature properties', () => {
    const properties = {
      dv_adm0_id: 100,
      dv_adm1_id: 200,
      adm0_id: 1,
      adm1_id: 2,
    };
    expect(resolveChartBoundaryProperty(properties, 'dv_adm1_id')).toBe(200);
  });

  it('does not fall back to GAUL adm id when dv id is missing', () => {
    const properties = { adm2_id: 999, adm2_name: 'District' };
    expect(
      resolveChartBoundaryProperty(properties, 'dv_adm2_id'),
    ).toBeUndefined();
  });
});
