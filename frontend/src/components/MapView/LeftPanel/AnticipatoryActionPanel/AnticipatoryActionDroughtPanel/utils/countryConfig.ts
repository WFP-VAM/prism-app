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
 *   // 1. Define available categories (categories in UI)
 *   categories: [
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
  categories: {
    label: string;
    id: Exclude<AACategoryType, 'na' | 'ny'>;
  }[];

  // Season configuration
  seasonStartMonth: number; // 0-11 (January = 0)

  // Window configuration
  singleWindowMode?: boolean; // If true, only show Window 1

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

/**
 * Helper function to create a country configuration with sensible defaults
 * This makes it much easier to add new countries
 */
const createCountryConfig = (options: {
  categories: Array<{
    label: string;
    id: Exclude<AACategoryType, 'na' | 'ny'>;
  }>;
  seasonStartMonth: number;
  forecastSource?: string;
  singleWindowMode?: boolean;
  customContent?: {
    howToReadContent?: Array<{ title: string; text: string }>;
    descriptionText?: string;
  };
}): AADroughtCountryConfig => {
  const {
    categories,
    seasonStartMonth,
    forecastSource,
    singleWindowMode = false,
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
    ...(singleWindowMode
      ? []
      : [{ title: 'Window 2', text: 'Mid to end of the rainfall season.' }]),
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
        title: `${cat.label} category`,
        text: `Drought events that typically occur once every ${frequency} years.`,
      };
    }),
    {
      title: 'Ready, Set and Go phases',
      text: `The "Ready, Set & Go!" system uses seasonal forecasts${forecastSource && forecastSource !== 'default' ? ` from ${forecastSource}` : ''} with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).`,
    },
  ];

  return {
    categories,
    seasonStartMonth,
    singleWindowMode,
    howToReadContent: customContent.howToReadContent || defaultHowToReadContent,
    rowCategories,
    legendPhases,
    descriptionText:
      customContent.descriptionText ||
      `uses seasonal forecasts${forecastSource && forecastSource !== 'default' ? ` from ${forecastSource}` : ''} with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).`,
    forecastSource,
  };
};

const AADROUGHT_COUNTRY_CONFIGS: Record<string, AADroughtCountryConfig> = {
  malawi: createCountryConfig({
    categories: [{ label: 'Below Normal', id: 'Normal' }],
    seasonStartMonth: 7,
    forecastSource: 'ECMWF',
    customContent: {
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
      descriptionText:
        'uses seasonal forecasts from ECMWF with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
    },
  }),
  tanzania: createCountryConfig({
    categories: [
      { label: 'Severe', id: 'Severe' },
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Mild', id: 'Mild' },
      { label: 'Below Normal', id: 'Normal' },
    ],
    seasonStartMonth: 6,
    forecastSource: 'ECMWF',
    customContent: {
      howToReadContent: [
        { title: 'OND', text: 'October to December' },
        { title: 'MAM', text: 'March to May' },
      ],
    },
  }),
  zambia: createCountryConfig({
    singleWindowMode: true,
    categories: [{ label: 'Moderate', id: 'Moderate' }],
    seasonStartMonth: 7,
    forecastSource: 'ECMWF',
    customContent: {
      howToReadContent: [{ title: 'Window 1', text: 'November to January' }],
    },
  }),
  zimbabwe: createCountryConfig({
    categories: [
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Below Normal', id: 'Normal' },
    ],
    seasonStartMonth: 4,
  }),
  mozambique: createCountryConfig({
    categories: [
      { label: 'Severe', id: 'Severe' },
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Mild', id: 'Mild' },
    ],
    seasonStartMonth: 4,
  }),
};

export const getAADroughtCountryConfig = (): AADroughtCountryConfig =>
  AADROUGHT_COUNTRY_CONFIGS[safeCountry] || {};

export const getRowCategories = (): {
  category: AACategoryType;
  phase: AAPhaseType;
}[] => {
  const config = getAADroughtCountryConfig();
  return config.rowCategories;
};

export const getLegendPhases = () => {
  const config = getAADroughtCountryConfig();

  return config.legendPhases.map(phase => {
    let icon: React.ReactElement;

    const category = config.categories.find(
      cat => cat.label === phase.severity,
    )?.id;

    if (category) {
      icon = getAAIcon(category, phase.phase as 'Ready' | 'Set', true);
    } else if (phase.phase === 'No Action') {
      icon = getAAIcon('na', 'na', true);
    } else {
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

export const isSingleWindowMode = (): boolean => {
  const config = getAADroughtCountryConfig();
  return config.singleWindowMode || false;
};

// Helper function to calculate season based on country config
export const calculateSeason = (date: string | undefined): string => {
  // avoid timezone issues by adding 12:00:00.000Z
  const currentDate = date ? new Date(`${date}T12:00:00.000Z`) : new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const config = getAADroughtCountryConfig();

  // month is 0-indexed, so we add 1 to make it 1-indexed
  if (month + 1 >= config.seasonStartMonth) {
    // After season start month
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  // Before season start month
  return `${year - 1}-${year.toString().slice(-2)}`;
};
