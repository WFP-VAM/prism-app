/* eslint-disable fp/no-mutating-methods, fp/no-mutation */
import React from 'react';
import {
  AACategoryType,
  AAPhaseType,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { safeCountry } from 'config';
import { getAAIcon } from '../utils';

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
 *   // 2. Season configuration (when new season starts)
 *   seasonStartMonth: 4, // May (0-indexed: 0=Jan, 1=Feb, ..., 11=Dec)
 *   // Timeline starts automatically one month before season
 *
 *   // 3. Content and display
 *   howToReadContent: [
 *     { title: 'Window Label', text: 'Description of window period.' },
 *     { title: 'Category Name', text: 'Description of category.' },
 *   ],
 *   descriptionText: 'Description of the AA system.',
 *
 *   // 4. Forecast source (optional)
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
    seasonStartMonth: 7,
    howToReadContent: [
      { title: 'NDJ', text: 'November to January' },
      { title: 'JFM', text: 'January to March' },
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
  mozambique: {
    checkboxes: [
      { label: 'Severe', id: 'Severe' },
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Mild', id: 'Mild' },
    ],
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
  zambia: {
    checkboxes: [{ label: 'Below Normal', id: 'Normal' }],
    seasonStartMonth: 7,
    howToReadContent: [
      { title: 'Window 1', text: 'November to January' },
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
      'uses seasonal forecasts with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
  },
  zimbabwe: {
    checkboxes: [
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Below Normal', id: 'Normal' },
    ],
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
};

export const getAADroughtCountryConfig = (): AADroughtCountryConfig =>
  AADROUGHT_COUNTRY_CONFIGS[safeCountry];

export const getRowCategories = (): {
  category: AACategoryType;
  phase: AAPhaseType;
}[] => {
  const config = getAADroughtCountryConfig();
  return config.rowCategories;
};

export const getLegendPhases = () => {
  const config = getAADroughtCountryConfig();

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

export const getDescriptionText = (): string => {
  const config = getAADroughtCountryConfig();
  return config.descriptionText;
};

// New utility functions for enhanced configuration

export const getTimelineOffset = () => {
  const config = getAADroughtCountryConfig();
  return config.seasonStartMonth - 1;
};

export const getForecastSource = (): string => {
  const config = getAADroughtCountryConfig();
  return config.forecastSource || 'default';
};

// Helper function to calculate season based on country config
export const calculateSeason = (date: string | undefined): string => {
  // avoid timezone issues by adding 12:00:00.000Z
  const currentDate = date ? new Date(`${date}T12:00:00.000Z`) : new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const config = getAADroughtCountryConfig();

  // eslint-disable-next-line no-console
  console.log({
    date,
    currentDate,
    year,
    month,
    startMonth: config.seasonStartMonth,
  });

  // month is 0-indexed, so we add 1 to make it 1-indexed
  if (month + 1 >= config.seasonStartMonth) {
    // After season start month
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  // Before season start month
  return `${year - 1}-${year.toString().slice(-2)}`;
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
  seasonStartMonth: number;
  forecastSource?: string;
  customContent?: {
    howToReadContent?: Array<{ title: string; text: string }>;
    descriptionText?: string;
  };
}): AADroughtCountryConfig => {
  const {
    categories,
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
