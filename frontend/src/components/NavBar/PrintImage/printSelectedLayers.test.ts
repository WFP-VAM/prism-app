import { LayerType } from 'config/types';

import { getPrintSelectedLayers } from './printSelectedLayers';

const wmsLayer = { id: 'precip_blended_dekad', type: 'wms' } as LayerType;
const zarrLayer = { id: 'ecmwf_aifs_t2m', type: 'zarr' } as LayerType;
const cogLayer = { id: 'some_cog', type: 'cog' } as LayerType;
const boundaryLayer = { id: 'admin_boundaries', type: 'boundary' } as LayerType;

describe('getPrintSelectedLayers', () => {
  test('returns empty array in default print mode with WMS-only layers', () => {
    expect(
      getPrintSelectedLayers({
        batchMapsVisibility: false,
        countryMask: false,
        deferredLayerIdForPreview: null,
        selectedLayers: [boundaryLayer, wmsLayer],
      }),
    ).toEqual([]);
  });

  test('returns selected layers in default print mode when a Zarr layer is active', () => {
    expect(
      getPrintSelectedLayers({
        batchMapsVisibility: false,
        countryMask: false,
        deferredLayerIdForPreview: null,
        selectedLayers: [boundaryLayer, zarrLayer],
      }),
    ).toEqual([boundaryLayer, zarrLayer]);
  });

  test('returns selected layers in default print mode when a COG layer is active', () => {
    expect(
      getPrintSelectedLayers({
        batchMapsVisibility: false,
        countryMask: false,
        deferredLayerIdForPreview: null,
        selectedLayers: [boundaryLayer, cogLayer],
      }),
    ).toEqual([boundaryLayer, cogLayer]);
  });

  test('returns selected layers when country mask is enabled', () => {
    expect(
      getPrintSelectedLayers({
        batchMapsVisibility: false,
        countryMask: true,
        deferredLayerIdForPreview: null,
        selectedLayers: [boundaryLayer, wmsLayer],
      }),
    ).toEqual([boundaryLayer, wmsLayer]);
  });
});
