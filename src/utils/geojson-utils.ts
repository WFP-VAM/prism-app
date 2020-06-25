/**
 * Utils functions to calculate the extent of GeoJSON data
 * Inspired from https://github.com/jczaplew/geojson-bounds (CC-BY-4.0)
 * */

import {
  Feature,
  GeometryCollection,
  FeatureCollection,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiPolygon,
  MultiLineString,
  Geometry,
} from '@turf/helpers';

type GeoJSONFeature =
  | Feature
  | GeometryCollection
  | FeatureCollection
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiPolygon
  | MultiLineString
  | Geometry;

type coordinates = [number, number][];

/*
   Modified version of underscore.js's flatten function
   https://github.com/jashkenas/underscore/blob/master/underscore.js#L501
  */
function flatten(input: any, output: any = []): coordinates {
  let idx = output.length;
  // eslint-disable-next-line
  for (let i = 0; i < input.length; i++) {
    if (Array.isArray(input[i]) && Array.isArray(input[i][0])) {
      flatten(input[i], output);
      idx = output.length;
    } else {
      // eslint-disable-next-line
      output[idx++] = input[i];
    }
  }
  return Array.isArray(output[0]) ? output : ([output] as coordinates);
}

// We are using reduce instead of Math.max and Math.min because these functions are recursive
// and hitting the call stack size limit.
function getMax(arr: number[]) {
  const max = arr.reduce(
    (tempMax, v) => (tempMax >= v ? tempMax : v),
    -Infinity,
  );
  return max !== -Infinity ? max : null;
}

function getMin(arr: number[]) {
  const min = arr.reduce(
    (tempMin, v) => (tempMin <= v ? tempMin : v),
    Infinity,
  );
  return min !== Infinity ? min : null;
}

function maxLat(coords: coordinates) {
  return getMax(
    coords.map(function(d) {
      return d[1];
    }),
  );
}

function maxLng(coords: coordinates) {
  return getMax(
    coords.map(function(d) {
      return d[0];
    }),
  );
}

function minLat(coords: coordinates) {
  return getMin(
    coords.map(function(d) {
      return d[1];
    }),
  );
}

function minLng(coords: coordinates) {
  return getMin(
    coords.map(function(d) {
      return d[0];
    }),
  );
}

function fetchExtent(coords: coordinates) {
  return [minLng(coords), minLat(coords), maxLng(coords), maxLat(coords)];
}

function feature(obj: any) {
  return flatten(obj.geometry.coordinates);
}

function featureCollection(f: any): coordinates {
  return flatten(f.features.map(feature));
}

function process(t: any): coordinates {
  if (!t) {
    return [];
  }

  switch (t.type) {
    case 'Feature':
      return feature(t);
    case 'GeometryCollection':
      // eslint-disable-next-line
      return geometryCollection(t);
    case 'FeatureCollection':
      return featureCollection(t);
    case 'Point':
    case 'LineString':
    case 'Polygon':
    case 'MultiPoint':
    case 'MultiPolygon':
    case 'MultiLineString':
      return flatten(t.coordinates);
    default:
      return [];
  }
}

function geometryCollection(g: any) {
  return flatten(g.geometries.map(process));
}

export function extent(t: any) {
  return fetchExtent(process(t));
}
