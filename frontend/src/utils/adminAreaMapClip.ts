import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import type { Map, Map as MaplibreMap } from 'maplibre-gl';

function exteriorRings(geometry: Polygon | MultiPolygon): Position[][] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates[0]];
  }

  return geometry.coordinates.map(polygon => polygon[0]);
}

function ringToPathSegment(ring: Position[], map: Map): string {
  const points = ring.map(([lng, lat]) => map.project([lng, lat]));
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  return `${path} Z`;
}

/** CSS clip-path value that keeps map content inside the admin area polygon. */
export function adminAreaFeatureToClipPath(
  feature: Feature<Polygon | MultiPolygon>,
  map: Map,
): string {
  const rings = exteriorRings(feature.geometry);
  if (rings.length === 0) {
    return 'none';
  }

  if (rings.length === 1) {
    const points = rings[0]
      .map(([lng, lat]) => {
        const projected = map.project([lng, lat]);
        return `${projected.x}px ${projected.y}px`;
      })
      .join(', ');
    return `polygon(${points})`;
  }

  const path = rings.map(ring => ringToPathSegment(ring, map)).join(' ');
  return `path('${path}')`;
}

export function applyAdminAreaClipPath(
  map: Map,
  container: HTMLElement,
  feature: Feature<Polygon | MultiPolygon> | null | undefined,
): void {
  container.style.clipPath = feature
    ? adminAreaFeatureToClipPath(feature, map)
    : '';
}

export function isMapFullyLoaded(map: MaplibreMap): boolean {
  return Boolean(map.isStyleLoaded() && map.areTilesLoaded() && map.loaded());
}

/** Keep the data overlay aligned with the basemap camera. */
export function syncMapView(source: MaplibreMap, target: MaplibreMap): void {
  target.jumpTo({
    center: source.getCenter(),
    zoom: source.getZoom(),
    bearing: source.getBearing(),
    pitch: source.getPitch(),
  });
}
