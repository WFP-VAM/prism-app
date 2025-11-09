import { Map } from 'maplibre-gl';

// Available SDF icons that support icon-color
export type IconShape = 'point' | 'square' | 'triangle' | 'diamond';

/**
 * Creates a simple SDF-compatible icon (white shape on transparent background)
 * SDF icons allow icon-color to tint them properly
 */
export const createSDFIcon = (
  shape: IconShape,
  size: number = 11,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  // eslint-disable-next-line fp/no-mutation
  canvas.width = size;
  // eslint-disable-next-line fp/no-mutation
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    return canvas;
  }

  // SDF icons use white color so icon-color can tint them
  // eslint-disable-next-line fp/no-mutation
  ctx.fillStyle = '#FFFFFF';

  const padding = 1;
  const center = size / 2;

  if (shape === 'square') {
    // Draw a square
    ctx.fillRect(padding, padding, size - padding * 2, size - padding * 2);
  } else if (shape === 'triangle') {
    // Draw a triangle pointing up
    ctx.beginPath();
    ctx.moveTo(center, padding);
    ctx.lineTo(size - padding, size - padding);
    ctx.lineTo(padding, size - padding);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'point') {
    // Draw a circle
    ctx.beginPath();
    ctx.arc(center, center, (size - padding * 2) / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'diamond') {
    // Draw a diamond (rotated square)
    ctx.beginPath();
    ctx.moveTo(center, padding);
    ctx.lineTo(size - padding, center);
    ctx.lineTo(center, size - padding);
    ctx.lineTo(padding, center);
    ctx.closePath();
    ctx.fill();
  }

  return canvas;
};

/**
 * Ensures SDF icons are loaded into the map.
 * First checks if they exist in the sprite, if not creates them.
 */
export const ensureSDFIconsLoaded = (map: Map | undefined) => {
  if (!map) {
    return;
  }

  const icons: IconShape[] = ['point', 'square', 'triangle', 'diamond'];

  icons.forEach(iconName => {
    // Check if icon already exists in the map style sprite
    if (map.hasImage(iconName)) {
      return;
    }

    // Create SDF-compatible icon if it doesn't exist
    const canvas = createSDFIcon(iconName, 11);
    const dataUrl = canvas.toDataURL();

    map.loadImage(dataUrl, (err, image) => {
      if (err) {
        console.error(`Failed to load SDF icon ${iconName}:`, err);
        return;
      }
      if (image && !map.hasImage(iconName)) {
        // Add as SDF icon so icon-color works
        map.addImage(iconName, image, { sdf: true });
      }
    });
  });
};
