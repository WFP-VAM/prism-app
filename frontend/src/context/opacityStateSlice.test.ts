import { LayerDefinitions } from 'config/utils';

import opacityReducer, { setOpacity } from './opacityStateSlice';

describe('opacityStateSlice activateAll fan-out', () => {
  const originalGroup = LayerDefinitions.ftw_field_boundaries?.group;

  beforeAll(() => {
    // Menu normally stamps this on; mirror FTW activateAll for the test.
    if (LayerDefinitions.ftw_field_boundaries) {
      LayerDefinitions.ftw_field_boundaries.group = {
        groupTitle: 'FTW crop fields (2025)',
        activateAll: true,
        layers: [
          { id: 'ftw_field_boundaries', label: 'Fields', main: true },
          { id: 'ftw_field_density', label: 'Density' },
        ],
      };
    }
  });

  afterAll(() => {
    if (LayerDefinitions.ftw_field_boundaries) {
      LayerDefinitions.ftw_field_boundaries.group = originalGroup;
    }
  });

  test('writes the same opacity to every activateAll group member', () => {
    const map = {
      getLayer: () => undefined,
      setPaintProperty: jest.fn(),
    } as any;

    const next = opacityReducer(
      { opacityMap: {}, error: null },
      setOpacity({
        map,
        layerId: 'ftw_field_boundaries',
        layerType: 'pmtiles_vector',
        value: 0.4,
      }),
    );

    expect(next.opacityMap.ftw_field_boundaries?.value).toBe(0.4);
    expect(next.opacityMap.ftw_field_density?.value).toBe(0.4);
  });
});
