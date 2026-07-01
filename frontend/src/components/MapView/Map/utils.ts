import { ProjectionSpecification, SkySpecification } from 'maplibre-gl';

export const mapStyle =
  process.env.REACT_APP_DEFAULT_STYLE ||
  'https://api.maptiler.com/maps/0ad52f6b-ccf2-4a36-a9b8-7ebd8365e56f/style.json?key=y2DTSu9yWiu755WByJr3';

/** Canvas/container fallback behind the WebGL globe (matches app lightGrey). */
export const mapBackdropColor = '#637178';

/** Globe projection for universal landing view and zoom-to-country animation. */
export const mapProjection: ProjectionSpecification = {
  type: 'globe',
};

/** Flat projection used after country zoom completes and in non-landing views. */
export const mapFlatProjection: ProjectionSpecification = {
  type: 'mercator',
};

/** Light gray sky/atmosphere for globe projection (re-applied on style.load by react-map-gl). */
export const mapSky: SkySpecification = {
  'sky-color': mapBackdropColor,
  'horizon-color': '#E0E0E0',
  'atmosphere-blend': 0.1,
};
