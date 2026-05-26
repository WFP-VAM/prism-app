import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';

export const AAPanelCategories: AACategory[] = [
  AACategory.Severe,
  AACategory.Moderate,
];

export const AADisplayCategory: {
  [key in AACategory]?: string;
} = {
  [AACategory.Severe]: 'Active >119 KM/H',
  [AACategory.Moderate]: 'Warning >89 KM/H',
};
