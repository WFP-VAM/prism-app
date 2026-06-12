import type { StyleSpecification } from 'maplibre-gl';

import {
  isBasemapLabelLayer,
  splitExportMapStyleForClipping,
} from './splitExportMapStyleForClipping';

const sampleStyle: StyleSpecification = {
  version: 8,
  sources: {
    basemap: { type: 'vector', tiles: ['https://example.com/{z}/{x}/{y}.pbf'] },
  },
  layers: [
    { id: 'background', type: 'background' },
    { id: 'roads', type: 'line', source: 'basemap', 'source-layer': 'roads' },
    {
      id: 'label_city',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
    },
    {
      id: 'label_country',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'countries',
    },
  ],
};

describe('splitExportMapStyleForClipping', () => {
  test('identifies basemap label layers by id', () => {
    expect(isBasemapLabelLayer({ id: 'label_city' })).toBe(true);
    expect(isBasemapLabelLayer({ id: 'roads' })).toBe(false);
  });

  test('splits label layers onto a transparent overlay style', () => {
    const { basemapStyle, labelsStyle } = splitExportMapStyleForClipping(
      sampleStyle,
      true,
    );

    expect(basemapStyle.layers.map(layer => layer.id)).toEqual([
      'background',
      'roads',
    ]);
    expect(labelsStyle?.layers.map(layer => layer.id)).toEqual([
      'background',
      'label_city',
      'label_country',
    ]);
  });

  test('returns no labels overlay when labels are hidden', () => {
    const { labelsStyle } = splitExportMapStyleForClipping(sampleStyle, false);
    expect(labelsStyle).toBeNull();
  });
});
