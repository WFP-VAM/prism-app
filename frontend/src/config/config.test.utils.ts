import jp from 'jsonpath';
import { startCase } from 'lodash';

export function extractTranslationItems(appConfig: any, layers: any): string[] {
  const categoryKeys = jp
    .query(appConfig.categories, '$.*')
    .filter(
      (value: any) =>
        typeof value === 'string' ||
        (typeof value === 'object' && value !== null && !Array.isArray(value)),
    )
    .map((value: any) =>
      typeof value === 'object' ? Object.keys(value) : value,
    )
    .flat()
    .map((value: any) => startCase(value));

  const categoryGroupTitles = jp.query(appConfig.categories, '$..group_title');

  const layerTitles = jp.query(layers, '$..title');
  const layerLegendTexts = jp.query(layers, '$..legend_text');
  const legendLabels = jp
    .query(layers, '$..legend[*].label')
    .filter((label: string) => !label.includes(' mm'));
  const chartLegendLabels = jp.query(layers, '$..chart_data.fields[*].label');

  return [
    ...categoryKeys,
    ...categoryGroupTitles,
    ...layerTitles,
    ...layerLegendTexts,
    ...legendLabels,
    ...chartLegendLabels,
  ];
}
