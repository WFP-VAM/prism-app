/**
 * Central asset registry for images.
 * Use getImageUrl() to resolve config paths (e.g. /images/logo.png) to bundled asset URLs.
 */

// Logos (used in prism.json config)
import wfpLogo from './logos/wfp_logo.png';
import mozFlagInamLogo from './logos/moz-flag-inam-logo.png';
import somaliaHeader from './logos/somalia-header.png';
import mwiMet from './logos/mwi-met.png';
import somaliaBottomLogo from './logos/somalia-bottom-logo.png';

// Category icons (used in prism.json icons config)
import iconAssessment from './icons/categories/icon_assessment.png';
import iconBasemap from './icons/categories/icon_basemap.png';
import iconCadreharmoise from './icons/categories/icon_cadreharmoise.png';
import iconCadreharmoise2 from './icons/categories/icon_cadreharmoise2.png';
import iconCapacity from './icons/categories/icon_capacity.png';
import iconClimate from './icons/categories/icon_climate.png';
import iconDrought from './icons/categories/icon_drought.png';
import iconEq from './icons/categories/icon_eq.png';
import iconFlood from './icons/categories/icon_flood.png';
import iconFoodsecurity from './icons/categories/icon_foodsecurity.png';
import iconImpact from './icons/categories/icon_impact.png';
import iconLivelihoods from './icons/categories/icon_livelihoods.png';
import iconRain from './icons/categories/icon_rain.png';
import iconSnow from './icons/categories/icon_snow.png';
import iconTable from './icons/categories/icon_table.png';
import iconTropicalStorm from './icons/categories/icon_tropical_storm.png';
import iconVeg from './icons/categories/icon_veg.png';
import iconVulnerable from './icons/categories/icon_vulnerable.png';

// Map config paths to bundled asset URLs
const IMAGE_REGISTRY: Record<string, string> = {
  // Logos
  'wfp_logo.png': wfpLogo,
  'moz-flag-inam-logo.png': mozFlagInamLogo,
  'somalia-header.png': somaliaHeader,
  'mwi-met.png': mwiMet,
  'somalia-bottom-logo.png': somaliaBottomLogo,
  // Category icons
  'icon_assessment.png': iconAssessment,
  'icon_basemap.png': iconBasemap,
  'icon_cadreharmoise.png': iconCadreharmoise,
  'icon_cadreharmoise2.png': iconCadreharmoise2,
  'icon_capacity.png': iconCapacity,
  'icon_climate.png': iconClimate,
  'icon_drought.png': iconDrought,
  'icon_eq.png': iconEq,
  'icon_flood.png': iconFlood,
  'icon_foodsecurity.png': iconFoodsecurity,
  'icon_impact.png': iconImpact,
  'icon_livelihoods.png': iconLivelihoods,
  'icon_rain.png': iconRain,
  'icon_snow.png': iconSnow,
  'icon_table.png': iconTable,
  'icon_tropical_storm.png': iconTropicalStorm,
  'icon_veg.png': iconVeg,
  'icon_vulnerable.png': iconVulnerable,
};

/**
 * Resolves a config image path to the bundled asset URL.
 * Handles: /images/xxx.png, images/xxx.png, xxx.png
 */
export function getImageUrl(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  const filename = path.replace(/^\/?images\//, '').trim();
  return IMAGE_REGISTRY[filename] ?? IMAGE_REGISTRY[path] ?? path;
}

export { wfpLogo };
export { default as iconNorthArrow } from './map-export/icon_north_arrow.png';
// SVG imports return URL string in Vite
export { default as iconPoint } from './icons/layer-types/icon_point.svg';
export { default as iconRaster } from './icons/layer-types/icon_raster.svg';
export { default as iconPolygon } from './icons/layer-types/icon_polygon.svg';
