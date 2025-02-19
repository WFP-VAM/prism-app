import { AACategory } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';

export const AAPanelCategories: AACategory[] = [
  AACategory.Severe,
  AACategory.Moderate,
];

export const AADisplayCategory: {
  [key in AACategory]?: string;
} = {
  [AACategory.Severe]: ' >118 KM/H',
  [AACategory.Moderate]: ' >89 KM/H',
};
