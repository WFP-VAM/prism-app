import React from 'react';
import {
  AACategoryType,
  AAPhaseType,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';

export interface AADroughtCountryConfig {
  checkboxes: {
    label: string;
    id: Exclude<AACategoryType, 'na' | 'ny'>;
  }[];
  windowLabels: Record<string, string>;
  howToReadContent: { title: string; text: string }[];
  rowCategories: { category: AACategoryType; phase: AAPhaseType }[];
  legendPhases: {
    icon: React.ReactNode;
    phase: string;
    severity?: string;
  }[];
  descriptionText: string;
}

const AADROUGHT_COUNTRY_CONFIGS: Record<string, AADroughtCountryConfig> = {
  malawi: {
    checkboxes: [{ label: 'Below Normal', id: 'Normal' }],
    windowLabels: {
      'Window 1': 'NDJ',
      'Window 2': 'JFM',
    },
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
  },
  zimbabwe: {
    checkboxes: [
      { label: 'Moderate', id: 'Moderate' },
      { label: 'Below Normal', id: 'Normal' },
    ],
    windowLabels: {},
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
