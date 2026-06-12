import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

import { clipFeatureCollectionToPolygon } from './clipVectorData';

const clipPolygon: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
};

const CLIP_ID = 'test-clip';

function pointFeature(lng: number, lat: number): Feature<Point> {
  return {
    type: 'Feature',
    properties: { lng, lat },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  };
}

describe('clipFeatureCollectionToPolygon', () => {
  it('returns the input unchanged when there is no clip polygon', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [pointFeature(50, 50)],
    };
    expect(clipFeatureCollectionToPolygon(fc, null, CLIP_ID)).toBe(fc);
  });

  it('drops points outside the polygon and keeps points inside', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [pointFeature(5, 5), pointFeature(50, 50), pointFeature(1, 9)],
    };
    const result = clipFeatureCollectionToPolygon(fc, clipPolygon, CLIP_ID);
    expect(result.features).toHaveLength(2);
    expect(
      result.features.every(f =>
        booleanPointInPolygon(f.geometry as Point, clipPolygon),
      ),
    ).toBe(true);
  });

  it('clips a polygon feature to the intersection', () => {
    const overlapping: Feature<Polygon> = {
      type: 'Feature',
      properties: { id: 'a' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [5, 5],
            [20, 5],
            [20, 20],
            [5, 20],
            [5, 5],
          ],
        ],
      },
    };
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [overlapping],
    };
    const result = clipFeatureCollectionToPolygon(fc, clipPolygon, CLIP_ID);
    expect(result.features).toHaveLength(1);
    // Properties are preserved and geometry is clipped to <= the original.
    expect(result.features[0].properties).toEqual({ id: 'a' });
    const coords = (result.features[0].geometry as Polygon).coordinates[0];
    coords.forEach(([lng, lat]) => {
      expect(lng).toBeLessThanOrEqual(10 + 1e-9);
      expect(lat).toBeLessThanOrEqual(10 + 1e-9);
    });
  });

  it('drops polygon features that do not intersect', () => {
    const disjoint: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [20, 20],
            [30, 20],
            [30, 30],
            [20, 30],
            [20, 20],
          ],
        ],
      },
    };
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [disjoint],
    };
    expect(
      clipFeatureCollectionToPolygon(fc, clipPolygon, CLIP_ID).features,
    ).toHaveLength(0);
  });

  it('memoizes by (collection, clipId) returning a stable reference', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [pointFeature(5, 5)],
    };
    const first = clipFeatureCollectionToPolygon(fc, clipPolygon, CLIP_ID);
    const second = clipFeatureCollectionToPolygon(fc, clipPolygon, CLIP_ID);
    expect(first).toBe(second);
  });
});
