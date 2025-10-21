export const TABLE_WIDTH = 500;
export const CHART_WIDTH = 700;
export const ForecastWindowPerCountry = {
  mozambique: {
    start: 3,
    end: 5,
  },
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to create chart color variants
const createChartColors = (baseColor: string) => ({
  solid: baseColor,
  transparent: hexToRgba(baseColor, 0.4),
  fill: hexToRgba(baseColor, 0.25),
});

// AA Flood Color Constants
const riskLevels = {
  severe: '#E63701', // Red
  moderate: '#FF8C21', // Orange
  bankfull: '#FFCC00', // Yellow
  notExceeded: '#6EB274', // Green
  noData: '#9E9E9E', // Gray
} as const;

export const AAFloodColors = {
  // Risk level colors
  riskLevels,

  // Chart colors with transparency (constructed from riskLevels)
  chart: {
    severe: createChartColors(riskLevels.severe),
    moderate: createChartColors(riskLevels.moderate),
    bankfull: createChartColors(riskLevels.bankfull),
    ensemble: {
      border: 'rgba(0, 0, 0, 0.18)',
      mean: '#212121',
    },
  },

  // Annotation colors
  annotation: {
    forecastStart: '#2196F3', // Blue
    forecastEnd: '#9C27B0', // Purple
  },
} as const;
