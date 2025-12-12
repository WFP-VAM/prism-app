import { LegendDefinitionItem } from 'config/types';

// Invert the colors of the legend, first color becomes last and vice versa
export const invertLegendColors = (
  legendItems: LegendDefinitionItem[],
): LegendDefinitionItem[] => {
  const reversedColors = legendItems.map(item => item.color).reverse();
  return legendItems.map((item, index) => ({
    ...item,
    color: reversedColors[index],
  }));
};
