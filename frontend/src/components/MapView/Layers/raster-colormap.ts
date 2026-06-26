import type { LegendDefinition } from 'config/types';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Build a 256×1 RGBA LUT from legend breakpoints.
 * Each texel i maps to value = (i/255)*maxValue.
 */
export function buildLegendColormapLut(
  legend: LegendDefinition,
  maxValue: number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(256 * 4);

  for (let i = 0; i < 256; i++) {
    const value = (i / 255) * maxValue;
    let colorHex = legend[0]?.color ?? '#000000';
    for (let j = legend.length - 1; j >= 0; j--) {
      const threshold = Number(legend[j]!.value);
      if (value >= threshold) {
        colorHex = legend[j]!.color;
        break;
      }
    }
    const [r, g, b] = hexToRgb(colorHex);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }

  return data;
}

/** Build ImageData for deck.gl-raster `createColormapTexture`. */
export function buildColormapImageData(
  legend: LegendDefinition,
  maxValue: number,
): ImageData {
  const lut = buildLegendColormapLut(legend, maxValue);
  return new ImageData(new Uint8ClampedArray(lut), 256, 1);
}
