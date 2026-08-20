import {
  collectPmtilesLayers,
  getRequiredPropertyKeys,
  getUniversalHdcChartPropertyKeys,
  isUniversalAdminBoundaryLayer,
  RawPmtilesBoundaryLayer,
  validateLayerAgainstMetadata,
  validatePmtilesUrl,
} from './validate-pmtiles-layers';

const sampleLayer: RawPmtilesBoundaryLayer = {
  configCountry: 'shared',
  layerId: 'universal_admin2_boundaries',
  path: 'https://example.com/test.pmtiles',
  layer_name: 'admin2',
  admin_level_codes: ['adm0_id', 'adm1_id', 'adm2_id'],
  admin_level_names: ['adm0_name', 'adm1_name', 'adm2_name'],
  admin_level_local_names: ['adm0_name', 'adm1_name', 'adm2_name'],
};

describe('validate-pmtiles-layers', () => {
  it('collectPmtilesLayers finds dual-owned universal admin PMTiles boundaries', () => {
    const configDir = `${__dirname}/../src/config`;
    const layers = collectPmtilesLayers(configDir);
    expect(layers.length).toBeGreaterThan(0);
    expect(
      layers.some(
        l =>
          l.layerId === 'universal_admin2_boundaries' &&
          l.layer_name === 'admin2',
      ),
    ).toBe(true);
    expect(
      layers.some(
        l =>
          l.layerId === 'universal_admin0_boundaries' &&
          l.layer_name === 'admin0',
      ),
    ).toBe(true);
  });

  it('getRequiredPropertyKeys merges admin key arrays', () => {
    const keys = getRequiredPropertyKeys(sampleLayer);
    expect(keys).toContain('adm2_id');
    expect(keys).toContain('adm2_name');
    expect(keys).toContain('dv_adm0_id');
    expect(keys).toContain('dv_adm2_id');
    expect(keys).not.toContain('dv_adm0_name');
  });

  it('getUniversalHdcChartPropertyKeys returns dv id keys per admin level', () => {
    expect(getUniversalHdcChartPropertyKeys(sampleLayer)).toEqual([
      'dv_adm0_id',
      'dv_adm1_id',
      'dv_adm2_id',
    ]);
  });

  it('isUniversalAdminBoundaryLayer keys off layer id prefix', () => {
    expect(isUniversalAdminBoundaryLayer(sampleLayer)).toBe(true);
    expect(
      isUniversalAdminBoundaryLayer({
        layerId: 'admin1_boundaries',
      }),
    ).toBe(false);
  });

  it('getRequiredPropertyKeys omits dv keys for non-universal-admin layers', () => {
    const countryLayer: RawPmtilesBoundaryLayer = {
      ...sampleLayer,
      configCountry: 'mozambique',
      layerId: 'admin2_boundaries',
    };
    const keys = getRequiredPropertyKeys(countryLayer);
    expect(keys).not.toContain('dv_adm0_id');
  });

  it('validateLayerAgainstMetadata passes when layer and fields exist', () => {
    const errors = validateLayerAgainstMetadata(sampleLayer, {
      vector_layers: [
        {
          id: 'admin2',
          fields: {
            adm0_id: 'Number',
            adm0_name: 'String',
            adm1_id: 'Number',
            adm1_name: 'String',
            adm2_id: 'Number',
            adm2_name: 'String',
            dv_adm0_id: 'Number',
            dv_adm1_id: 'Number',
            dv_adm2_id: 'Number',
          },
        },
      ],
    });
    expect(errors).toHaveLength(0);
  });

  it('validateLayerAgainstMetadata fails when layer_name is missing', () => {
    const errors = validateLayerAgainstMetadata(sampleLayer, {
      vector_layers: [{ id: 'admin0', fields: {} }],
    });
    expect(
      errors.some(e => e.includes('source layer "admin2" not found')),
    ).toBe(true);
  });

  it('validateLayerAgainstMetadata fails when dv chart id keys are missing on universal layer', () => {
    const errors = validateLayerAgainstMetadata(sampleLayer, {
      vector_layers: [
        {
          id: 'admin2',
          fields: {
            adm0_id: 'Number',
            adm0_name: 'String',
            adm1_id: 'Number',
            adm1_name: 'String',
            adm2_id: 'Number',
            adm2_name: 'String',
          },
        },
      ],
    });
    expect(errors.some(e => e.includes('dv_adm2_id'))).toBe(true);
  });

  it('validateLayerAgainstMetadata fails when property keys are missing', () => {
    const errors = validateLayerAgainstMetadata(sampleLayer, {
      vector_layers: [
        {
          id: 'admin2',
          fields: { adm0_id: 'Number' },
        },
      ],
    });
    expect(errors.some(e => e.includes('adm2_name'))).toBe(true);
  });

  it('validatePmtilesUrl reports unreachable archive', async () => {
    const errors = await validatePmtilesUrl(
      'https://example.com/bad.pmtiles',
      [sampleLayer],
      () => ({
        getHeader: async () => {
          throw new Error('network error');
        },
        getMetadata: async () => ({}),
      }),
    );
    expect(errors.some(e => e.includes('unreachable'))).toBe(true);
  });

  it('validatePmtilesUrl passes with mocked metadata', async () => {
    const errors = await validatePmtilesUrl(
      'https://example.com/ok.pmtiles',
      [sampleLayer],
      () => ({
        getHeader: async () => ({}),
        getMetadata: async () => ({
          vector_layers: [
            {
              id: 'admin2',
              fields: {
                adm0_id: 'Number',
                adm0_name: 'String',
                adm1_id: 'Number',
                adm1_name: 'String',
                adm2_id: 'Number',
                adm2_name: 'String',
                dv_adm0_id: 'Number',
                dv_adm1_id: 'Number',
                dv_adm2_id: 'Number',
              },
            },
          ],
        }),
      }),
    );
    expect(errors).toHaveLength(0);
  });
});
