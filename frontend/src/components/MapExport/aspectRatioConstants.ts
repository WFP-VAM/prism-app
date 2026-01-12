/**
 * Aspect Ratio Constants - All aspect ratio types, utilities, and UI options.
 * To add a new aspect ratio, simply add it to ASPECT_RATIO_CONFIG.
 */

/**
 * Configuration for all preset aspect ratios.
 * - decimal: The numeric ratio (width / height)
 * - order: Display order in UI dropdowns
 */
export const ASPECT_RATIO_CONFIG = {
  '3:2': { decimal: 1.5, order: 0 },
  '4:3': { decimal: 4 / 3, order: 1 },
  '6:5': { decimal: 1.2, order: 2 },
  '1:1': { decimal: 1.0, order: 3 },
  '2:3': { decimal: 2 / 3, order: 4 },
  'A4-P': { decimal: 1 / 1.414, order: 5 }, // ~0.707, A4 Portrait
  'A4-L': { decimal: 1.414, order: 6 }, // A4 Landscape
} as const;

export type PresetAspectRatio = keyof typeof ASPECT_RATIO_CONFIG;
export type CustomAspectRatio = { w: number; h: number };
export type AspectRatio = 'Auto' | PresetAspectRatio | CustomAspectRatio;
export type AspectRatioOption = AspectRatio | 'Custom';

export function isAutoRatio(ratio: AspectRatio): ratio is 'Auto' {
  return ratio === 'Auto';
}

export function isCustomRatio(ratio: AspectRatio): ratio is CustomAspectRatio {
  return typeof ratio === 'object' && ratio !== null;
}

export function isPresetRatio(ratio: AspectRatio): ratio is PresetAspectRatio {
  return (
    typeof ratio === 'string' &&
    ratio !== 'Auto' &&
    ratio in ASPECT_RATIO_CONFIG
  );
}

export const ASPECT_RATIO_DECIMAL_MAP = new Map<PresetAspectRatio, number>(
  (
    Object.entries(ASPECT_RATIO_CONFIG) as [
      PresetAspectRatio,
      { decimal: number; order: number },
    ][]
  ).map(([ratio, config]) => [ratio, config.decimal]),
);

/**
 * Get the decimal value for any aspect ratio.
 *
 * @param ratio - The aspect ratio (Auto, preset, or custom)
 * @param autoWidth - Width for Auto mode (required when ratio is 'Auto')
 * @param autoHeight - Height for Auto mode (required when ratio is 'Auto')
 * @returns The numeric aspect ratio value (width / height)
 * @throws Error if Auto is used without dimensions or unknown preset
 */
export function getAspectRatioDecimal(
  ratio: AspectRatio,
  autoWidth?: number,
  autoHeight?: number,
): number {
  if (isAutoRatio(ratio)) {
    if (autoWidth && autoHeight) {
      return autoWidth / autoHeight;
    }
    throw new Error('Auto aspect ratio requires autoWidth and autoHeight');
  }

  if (isCustomRatio(ratio)) {
    if (ratio.w <= 0 || ratio.h <= 0) {
      throw new Error('Custom aspect ratio requires positive w and h values');
    }
    return ratio.w / ratio.h;
  }

  const decimal = ASPECT_RATIO_DECIMAL_MAP.get(ratio);
  if (decimal === undefined) {
    throw new Error(`Unknown aspect ratio: ${ratio}`);
  }
  return decimal;
}

export function isValidAspectRatioParam(param: string): boolean {
  const lower = param.toLowerCase();
  if (lower === 'auto' || lower === 'custom') {
    return true;
  }
  return param in ASPECT_RATIO_CONFIG;
}

export const PRESET_RATIOS: PresetAspectRatio[] = (
  Object.entries(ASPECT_RATIO_CONFIG) as [
    PresetAspectRatio,
    { decimal: number; order: number },
  ][]
)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([ratio]) => ratio);

export const ALL_ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  'Auto',
  ...PRESET_RATIOS,
  'Custom',
];
