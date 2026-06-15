import {
  getCountriesFromAdmin0Features,
  getCountryBbox,
  getUniversalAdmin0LandingFilter,
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
    expect(bbox).toEqual([172.4617, 18.9104, -66.9499, 71.3652]);
    const longitudeSpan =
      bbox![0] <= bbox![2] ? bbox![2] - bbox![0] : 360 - bbox![0] + bbox![2];
    expect(longitudeSpan).toBeLessThanOrEqual(180);
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

  it('returns a MapLibre filter excluding iso3 codes starting with lowercase x', () => {
    expect(getUniversalAdmin0LandingFilter()).toEqual([
      '!=',
      ['slice', ['get', 'iso3'], 0, 1],
      'x',
    ]);
  });

  it('excludes pseudo-countries whose raw iso3 starts with lowercase x from the country list', () => {
    const countries = getCountriesFromAdmin0Features([
      { properties: { iso3: 'MOZ', adm0_name: 'Mozambique' } },
      { properties: { iso3: 'xKO', adm0_name: 'Pseudo Korea' } },
      { properties: { iso3: 'ITA', adm0_name: 'Italy' } },
    ]);
    expect(countries).toEqual([
      { iso3: 'ITA', name: 'Italy' },
      { iso3: 'MOZ', name: 'Mozambique' },
    ]);
  });
});
