import { Map, ProjectionSpecification } from 'maplibre-gl';

export const mapStyle =
  process.env.REACT_APP_DEFAULT_STYLE ||
  'https://api.maptiler.com/maps/0ad52f6b-ccf2-4a36-a9b8-7ebd8365e56f/style.json?key=y2DTSu9yWiu755WByJr3';

export const mapProjection: ProjectionSpecification = {
  type: 'globe',
};

export function applyMapProjection(map: Map): void {
  map.setProjection(mapProjection);
}

/** Apply globe projection and re-apply whenever the basemap style reloads. */
export function initMapProjection(map: Map): void {
  applyMapProjection(map);
  map.on('style.load', applyMapProjection);
}
