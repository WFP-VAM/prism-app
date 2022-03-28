import { FeatureCollection } from 'geojson';

export function getAdminLayerURL(adminLevel = 1): string {
  switch (adminLevel) {
    case 3:
      return './data/myanmar/admin_boundaries.json';
    case 2:
      return './data/myanmar/mmr_admin2_boundaries.json';
    case 1:
    default:
      return './data/myanmar/mmr_admin1_boundaries.json';
  }
}

export function getAdminNameProperty(adminLevel: number = 1): string {
  switch (adminLevel) {
    case 3:
      return 'TS';
    case 2:
      return 'DT';
    case 1:
    default:
      return 'ST';
  }
}

export function fetchAdminLayerGeoJSON(
  adminLevel = 1,
): Promise<FeatureCollection> {
  const url = getAdminLayerURL(adminLevel);
  return fetch(url).then(r => r.json());
}
