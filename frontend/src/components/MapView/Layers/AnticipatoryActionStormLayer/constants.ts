import anticipatoryActionIcons from 'components/Common/AnticipatoryAction/icons';
import { Map } from 'maplibre-gl';

export const WIND_TYPE_TO_ICON_MAP: Record<string, string> = {
  disturbance: anticipatoryActionIcons.disturbance,
  'tropical-disturbance': anticipatoryActionIcons.disturbance,
  low: anticipatoryActionIcons.disturbance,
  'tropical-depression': anticipatoryActionIcons.tropicalDepression,
  'post-tropical-depression': anticipatoryActionIcons.postTropicalDepression,
  'sub-tropical-depression': anticipatoryActionIcons.subTropicalDepression,
  'extratropical-system': anticipatoryActionIcons.extraTropicalSystem,
  'moderate-tropical-storm': anticipatoryActionIcons.moderateStorm,
  'severe-tropical-storm': anticipatoryActionIcons.severeTropicalStorm,
  'tropical-cyclone': anticipatoryActionIcons.tropicalCyclone,
  'intense-tropical-cyclone': anticipatoryActionIcons.intenseTropicalCyclone,
  'very-intense-tropical-cyclone':
    anticipatoryActionIcons.veryIntenseTropicalCyclone,
  inland: anticipatoryActionIcons.inland,
  dissipating: anticipatoryActionIcons.dissipating,
  default: anticipatoryActionIcons.default,
};

/**
 * Loads all storm icons into a MapLibre GL map instance
 * @param map - The MapLibre GL map instance to load icons into
 * @param throwOnError - Whether to throw errors or just log warnings (default: false)
 */
export const loadStormIcons = (map: Map | undefined, throwOnError = false) => {
  if (!map) {
    return;
  }

  const loadImage = (url: string, name: string) => {
    map.loadImage(url, (error, image) => {
      if (error) {
        if (throwOnError) {
          throw error;
        } else {
          console.warn(`Failed to load storm icon ${name}:`, error);
          return;
        }
      }
      if (!map.hasImage(name)) {
        map.addImage(name, image!);
      }
    });
  };

  Object.entries(WIND_TYPE_TO_ICON_MAP).forEach(([name, url]) => {
    loadImage(url, name);
  });
};
