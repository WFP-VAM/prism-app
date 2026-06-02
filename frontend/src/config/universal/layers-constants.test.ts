import {
  UNIVERSAL_PMTILES_URL,
  UNIVERSAL_ZONES_PATH_PREFIX,
} from './constants';
import layers from './layers.json';

describe('universal layers.json stays in sync with constants', () => {
  Object.entries(layers).forEach(([id, layer]) => {
    it(`${id} derives path/zones_path from constants`, () => {
      expect(layer.path).toBe(UNIVERSAL_PMTILES_URL);
      expect(layer.zones_path).toBe(
        `${UNIVERSAL_ZONES_PATH_PREFIX}/admin_level=${layer.admin_level}/admin_boundaries.parquet`,
      );
    });
  });
});
