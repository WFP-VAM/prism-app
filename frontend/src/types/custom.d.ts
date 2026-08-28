// Custom Type definitions

// Allow svg imports in .tsx
// https://stackoverflow.com/questions/44717164/unable-to-import-svg-files-in-typescript
declare module '*.svg' {
  import React = require('react');

  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const content: string;
  export default content;
}

// Generic CSS import definition
declare module '*.css' {
  interface IClassNames {
    [className: string]: string;
  }
  const classNames: IClassNames;
  export = classNames;
}

declare module '*.png';
declare module 'comlink';
declare module 'prism-common';
declare module 'zonal';

declare module 'redux-async-initial-state';

declare module '*.ttf';

declare module 'react-range-slider-input';

declare module 'max-inscribed-circle';
declare module 'vt-pbf';
// @mapbox/vector-tile has no bundled types; @types/mapbox__vector-tile pulls a
// stub @types/mapbox__point-geometry that breaks tsc (TS2688).
declare module '@mapbox/vector-tile' {
  import type Pbf from 'pbf';

  export class VectorTileFeature {
    type: number;
    properties: Record<string, string | number | boolean>;
    id?: number;
    loadGeometry(): Array<Array<{ x: number; y: number }>>;
    toGeoJSON(
      x: number,
      y: number,
      z: number,
    ): GeoJSON.Feature<GeoJSON.Geometry>;
  }

  export class VectorTileLayer {
    length: number;
    feature(i: number): VectorTileFeature;
  }

  export class VectorTile {
    constructor(pbf: Pbf);
    layers: Record<string, VectorTileLayer>;
  }
}
