import React from 'react';
import {
  AACategoryType,
  AAPhaseType,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';

/**
 * AA Drought Country Configuration Guide
 *
 * To add a new country, copy the template below and customize:
 *
 * ```typescript
 * countryName: {
 *   // 1. Define available categories (checkboxes in UI)
 *   checkboxes: [
 *     { label: 'Severe', id: 'Severe' },
 *     { label: 'Moderate', id: 'Moderate' },
 *     { label: 'Below Normal', id: 'Normal' },
 *   ],
 *
 *   // 2. Customize window labels (optional)
 *   windowLabels: {
 *     'Window 1': 'NDJ', // November-December-January
 *     'Window 2': 'JFM', // January-February-March
 *   },
 *
 *   // 3. Season configuration (when new season starts)
 *   seasonStartMonth: 4, // May (0-indexed: 0=Jan, 1=Feb, ..., 11=Dec)
 *   // Timeline starts automatically one month before season
 *
 *   // 4. Content and display
 *   howToReadContent: [
 *     { title: 'Window Label', text: 'Description of window period.' },
 *     { title: 'Category Name', text: 'Description of category.' },
 *   ],
 *   descriptionText: 'Description of the AA system.',
 *
 *   // 5. Forecast source (optional)
 *   forecastSource: 'ECMWF', // or 'default'
 * }
 * ```
 */

export interface AADroughtCountryConfig {
  // Basic configuration
  checkboxes: {
    label: string;
    id: Exclude<AACategoryType, 'na' | 'ny'>;
  }[];
  windowLabels: Record<string, string>;

  // Season configuration
  seasonStartMonth: number; // 0-11 (January = 0)

  // Content and display
  howToReadContent: { title: string; text: string }[];
  rowCategories: { category: AACategoryType; phase: AAPhaseType }[];
  legendPhases: {
    icon: React.ReactNode;
    phase: string;
    severity?: string;
  }[];
  descriptionText: string;

  // Forecast source (for country-specific descriptions)
  forecastSource?: string; // e.g., "ECMWF", "default"
}

const AADROUGHT_COUNTRY_CONFIGS: Record<string, AADroughtCountryConfig> = {
  malawi: {
    checkboxes: [{ label: 'Below Normal', id: 'Normal' }],
    windowLabels: {
      'Window 1': 'NDJ',
      'Window 2': 'JFM',
    },
    seasonStartMonth: 4,
    howToReadContent: [
      { title: 'NDJ', text: 'Start to mid of the rainfall season.' },
      { title: 'JFM', text: 'Mid to end of the rainfall season.' },
      {
        title: 'Below normal category',
        text: 'Drought events that typically occur once every 3 years.',
      },
      {
        title: 'Ready, Set and Go phases',
        text: 'The "Ready, Set & Go!" system uses seasonal forecasts from ECMWF with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
      },
    ],
    rowCategories: [
      { category: 'Normal', phase: 'Set' },
      { category: 'Normal', phase: 'Ready' },
      { category: 'na', phase: 'na' },
      { category: 'ny', phase: 'ny' },
    ],
    legendPhases: [
      {
        icon: null, // Will be set dynamically
        phase: 'Set',
        severity: 'Below Normal',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Ready',
        severity: 'Below Normal',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'No Action',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Not Yet Monitored',
      },
    ],
    descriptionText:
      'uses seasonal forecasts from ECMWF with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
    forecastSource: 'ECMWF',
  },
  zimbabwe: {
    checkboxes: [
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Below Normal', id: 'Normal' },
    ],
    windowLabels: {},
    seasonStartMonth: 4,
    howToReadContent: [
      { title: 'Window 1', text: 'Start to mid of the rainfall season.' },
      { title: 'Window 2', text: 'Mid to end of the rainfall season.' },
      {
        title: 'Below normal category',
        text: 'Drought events that typically occur once every 3 years.',
      },
      {
        title: 'Moderate category',
        text: 'Drought events that typically occur once every 5 years.',
      },
      {
        title: 'Ready, Set and Go phases',
        text: 'The "Ready, Set & Go!" system uses seasonal forecasts with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
      },
    ],
    rowCategories: [
      { category: 'Moderate', phase: 'Set' },
      { category: 'Moderate', phase: 'Ready' },
      { category: 'Normal', phase: 'Set' },
      { category: 'Normal', phase: 'Ready' },
      { category: 'na', phase: 'na' },
      { category: 'ny', phase: 'ny' },
    ],
    legendPhases: [
      {
        icon: null, // Will be set dynamically
        phase: 'Set',
        severity: 'Moderate',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Ready',
        severity: 'Moderate',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Set',
        severity: 'Below Normal',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Ready',
        severity: 'Below Normal',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'No Action',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Not Yet Monitored',
      },
    ],
    descriptionText:
      'uses seasonal forecasts with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
  },
  default: {
    checkboxes: [
      { label: 'Severe', id: 'Severe' },
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Mild', id: 'Mild' },
    ],
    windowLabels: {},
    seasonStartMonth: 4,
    howToReadContent: [
      { title: 'Window 1', text: 'Start to mid of the rainfall season.' },
      { title: 'Window 2', text: 'Mid to end of the rainfall season.' },
      {
        title: 'Mild category',
        text: 'Drought events that typically occur once every 4 years.',
      },
      {
        title: 'Moderate category',
        text: 'Drought events that typically occur once every 5 years.',
      },
      {
        title: 'Severe category',
        text: 'Drought events that typically occur once every 7 years.',
      },
      {
        title: 'Ready, Set and Go phases',
        text: 'The "Ready, Set & Go!" system uses seasonal forecasts with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
      },
    ],
    rowCategories: [
      { category: 'Severe', phase: 'Set' },
      { category: 'Severe', phase: 'Ready' },
      { category: 'Moderate', phase: 'Set' },
      { category: 'Moderate', phase: 'Ready' },
      { category: 'Mild', phase: 'Set' },
      { category: 'Mild', phase: 'Ready' },
      { category: 'na', phase: 'na' },
      { category: 'ny', phase: 'ny' },
    ],
    legendPhases: [
      {
        icon: null, // Will be set dynamically
        phase: 'Set',
        severity: 'Severe',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Ready',
        severity: 'Severe',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Set',
        severity: 'Moderate',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Ready',
        severity: 'Moderate',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Set',
        severity: 'Mild',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Ready',
        severity: 'Mild',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'No Action',
      },
      {
        icon: null, // Will be set dynamically
        phase: 'Not Yet Monitored',
      },
    ],
    descriptionText:
      'uses seasonal forecasts with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
  },
};

export const getAADroughtCountryConfig = (
  country: string,
): AADroughtCountryConfig =>
  AADROUGHT_COUNTRY_CONFIGS[country] || AADROUGHT_COUNTRY_CONFIGS.default;

export const getDisplayLabel = (windowKey: string, country: string): string => {
  const config = getAADroughtCountryConfig(country);
  return config.windowLabels[windowKey] || windowKey;
};

export const getRowCategories = (
  country: string,
): { category: AACategoryType; phase: AAPhaseType }[] => {
  const config = getAADroughtCountryConfig(country);
  return config.rowCategories;
};

export const getLegendPhases = (
  country: string,
  getAAIcon: (
    category: 'Severe' | 'Moderate' | 'Normal' | 'Mild' | 'na' | 'ny',
    phase: 'na' | 'ny' | 'Ready' | 'Set',
    forLayer?: boolean,
  ) => React.ReactElement,
) => {
  const config = getAADroughtCountryConfig(country);

  const severityToCategory: Record<
    string,
    'Severe' | 'Moderate' | 'Normal' | 'Mild'
  > = {
    Severe: 'Severe',
    Moderate: 'Moderate',
    'Below Normal': 'Normal',
    Mild: 'Mild',
  };

  return config.legendPhases.map(phase => {
    let icon: React.ReactElement;

    if (phase.severity && severityToCategory[phase.severity]) {
      const category = severityToCategory[phase.severity];
      // eslint-disable-next-line fp/no-mutation
      icon = getAAIcon(category, phase.phase as 'Ready' | 'Set', true);
    } else if (phase.phase === 'No Action') {
      // eslint-disable-next-line fp/no-mutation
      icon = getAAIcon('na', 'na', true);
    } else {
      // eslint-disable-next-line fp/no-mutation
      icon = getAAIcon('ny', 'ny', true);
    }

    return { ...phase, icon };
  });
};

export const getDescriptionText = (country: string): string => {
  const config = getAADroughtCountryConfig(country);
  return config.descriptionText;
};

// New utility functions for enhanced configuration

export const getTimelineOffset = (country: string) => {
  const config = getAADroughtCountryConfig(country);
  return config.seasonStartMonth - 1;
};

export const getSeasonConfig = (country: string) => {
  const config = getAADroughtCountryConfig(country);
  return {
    startMonth: config.seasonStartMonth,
    format: 'YYYY-YY',
  };
};

export const getForecastSource = (country: string): string => {
  const config = getAADroughtCountryConfig(country);
  return config.forecastSource || 'default';
};

// Helper function to calculate season based on country config
export const calculateSeason = (
  date: string | undefined,
  country: string,
): string => {
  const currentDate = date ? new Date(date) : new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const seasonConfig = getSeasonConfig(country);

  if (month >= seasonConfig.startMonth) {
    // After season start month
    if (seasonConfig.format === 'YYYY-YY') {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    }
    return `${year}-${year + 1}`;
  }

  // Before season start month
  if (seasonConfig.format === 'YYYY-YY') {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
  return `${year - 1}-${year}`;
};

/**
 * Helper function to create a country configuration with sensible defaults
 * This makes it much easier to add new countries
 */
export const createCountryConfig = (options: {
  categories: Array<{
    label: string;
    id: Exclude<AACategoryType, 'na' | 'ny'>;
  }>;
  windowLabels?: Record<string, string>;
  seasonStartMonth: number;
  forecastSource?: string;
  customContent?: {
    howToReadContent?: Array<{ title: string; text: string }>;
    descriptionText?: string;
  };
}): AADroughtCountryConfig => {
  const {
    categories,
    windowLabels = {},
    seasonStartMonth,
    forecastSource,
    customContent = {},
  } = options;

  // Generate row categories from available categories
  const rowCategories: { category: AACategoryType; phase: AAPhaseType }[] = [];
  categories.forEach(cat => {
    rowCategories.push({ category: cat.id, phase: 'Set' });
    rowCategories.push({ category: cat.id, phase: 'Ready' });
  });
  rowCategories.push({ category: 'na', phase: 'na' });
  rowCategories.push({ category: 'ny', phase: 'ny' });

  // Generate legend phases from available categories
  const legendPhases: Array<{
    icon: React.ReactNode;
    phase: string;
    severity?: string;
  }> = [];
  categories.forEach(cat => {
    legendPhases.push({
      icon: null,
      phase: 'Set',
      severity: cat.label,
    });
    legendPhases.push({
      icon: null,
      phase: 'Ready',
      severity: cat.label,
    });
  });
  legendPhases.push({ icon: null, phase: 'No Action' });
  legendPhases.push({ icon: null, phase: 'Not Yet Monitored' });

  // Generate default how-to-read content
  const defaultHowToReadContent = [
    { title: 'Window 1', text: 'Start to mid of the rainfall season.' },
    { title: 'Window 2', text: 'Mid to end of the rainfall season.' },
    ...categories.map(cat => {
      let frequency = '3';
      if (cat.id === 'Severe') {
        frequency = '7';
      } else if (cat.id === 'Moderate') {
        frequency = '5';
      } else if (cat.id === 'Mild') {
        frequency = '4';
      }

      return {
        title: `${cat.label.toLowerCase()} category`,
        text: `Drought events that typically occur once every ${frequency} years.`,
      };
    }),
    {
      title: 'Ready, Set and Go phases',
      text: `The "Ready, Set & Go!" system uses seasonal forecasts${forecastSource && forecastSource !== 'default' ? ` from ${forecastSource}` : ''} with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).`,
    },
  ];

  return {
    checkboxes: categories,
    windowLabels,
    seasonStartMonth,
    howToReadContent: customContent.howToReadContent || defaultHowToReadContent,
    rowCategories,
    legendPhases,
    descriptionText:
      customContent.descriptionText ||
      `uses seasonal forecasts${forecastSource && forecastSource !== 'default' ? ` from ${forecastSource}` : ''} with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).`,
    forecastSource,
  };
};

/**
 * Example: How to add a new country using the helper function
 *
 * Instead of manually creating the full configuration, you can use:
 *
 * ```typescript
 * // Add this to AADROUGHT_COUNTRY_CONFIGS
 * newCountry: createCountryConfig({
 *   categories: [
 *     { label: 'Moderate', id: 'Moderate' },
 *     { label: 'Below Normal', id: 'Normal' },
 *   ],
 *   windowLabels: {
 *     'Window 1': 'OND', // October-November-December
 *     'Window 2': 'JFM', // January-February-March
 *   },
 *   seasonStartMonth: 4, // May (when new season starts)
 *   forecastSource: 'ECMWF',
 *   customContent: {
 *     howToReadContent: [
 *       { title: 'OND', text: 'Early rainfall season.' },
 *       { title: 'JFM', text: 'Peak rainfall season.' },
 *       // ... other custom content
 *     ],
 *   },
 * }),
 * ```
 *
 * This automatically generates:
 * - Row categories for all category/phase combinations
 * - Legend phases with proper icons
 * - Default how-to-read content
 * - Proper timeline offset and season configuration
 */
