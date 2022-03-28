import React from 'react';

interface IconProps {
  style?: any;
}

export function IconPoint({ style }: IconProps) {
  return (
    <img
      src="/images/icon_point.svg"
      alt="point data type"
      style={{ height: 25, ...style }}
    />
  );
}

export function IconPolygon({ style }: IconProps) {
  return (
    <img
      src="/images/icon_polygon.svg"
      alt="polygon data type"
      style={{ height: 25, ...style }}
    />
  );
}

export function IconRaster({ style }: IconProps) {
  return (
    <img
      src="/images/icon_raster.svg"
      alt="raster data type"
      style={{ height: 25, ...style }}
    />
  );
}
