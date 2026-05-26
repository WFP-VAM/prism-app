/* eslint-disable react-refresh/only-export-components */
import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { AAPhaseType } from 'context/anticipatoryAction/AAStormStateSlice/types';

// Centralized colors for AA Storm
export const AAStormColors = {
  categories: {
    severe: { background: '#E63701', text: 'white' },
    moderate: { background: '#FF8934', text: 'black' },
    risk: { background: '#FF8934', text: 'black' },
    na: { background: 'grey', text: 'white' },
  },
  background: '#F1F1F1',
} as const;

// TODO - remove unecessary AACategoryPhaseMap
const AACategoryPhaseMap: { [key in AACategory]?: any } = {
  [AACategory.Severe]: {
    Active: {
      color: AAStormColors.categories.severe,
      iconProps: { topText: 'R', bottomText: 'SEV', color: 'white' },
    },
    na: {
      color: AAStormColors.categories.na,
      iconProps: { topText: 'na', bottomText: 'SEV', color: 'black' },
    },
  },
  [AACategory.Moderate]: {
    Active: {
      color: AAStormColors.categories.moderate,
      iconProps: { topText: 'R', bottomText: 'MOD', color: 'black' },
    },
    na: {
      color: AAStormColors.categories.na,
      iconProps: { topText: 'na', bottomText: 'MOD', color: 'black' },
    },
  },
  [AACategory.Risk]: {
    Active: {
      color: AAStormColors.categories.risk,
      iconProps: { topText: 'R', bottomText: 'MOD', color: 'black' },
    },
    na: {
      color: AAStormColors.categories.na,
      iconProps: { topText: 'na', bottomText: 'MOD', color: 'black' },
    },
  },
};

// TODO - rename to getAAStormColor
export function getAAColor(
  severity: AACategory,
  phase: AAPhaseType,
  forLayer: boolean = false,
) {
  const categoryData = AACategoryPhaseMap[severity];
  if (!forLayer) {
    return `repeating-linear-gradient(
      -45deg,
      ${AAStormColors.background},
      ${AAStormColors.background} 10px,
      white 10px,
      white 20px
    )`;
  }
  if (categoryData.color) {
    return categoryData.color;
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${severity}, ${phase}`);
  }
  return phaseData.color;
}
