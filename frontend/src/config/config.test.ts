import jp from 'jsonpath';
import { startCase } from 'lodash';
import fg from 'fast-glob';
import fs from 'fs';
import { Country, configMap, getRawLayers, getTranslation } from './index';

// Load all translation keys from the source code
const translationKeyRegex = /[ {]t\('([^']+)'\)/g;
const files = fg.sync('./src/**/*.{ts,tsx}');
const translationKeys = new Set<string>();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  // eslint-disable-next-line fp/no-mutation, no-cond-assign
  while ((match = translationKeyRegex.exec(content)) !== null) {
    translationKeys.add(match[1]);
  }
});

describe('Config Map', () => {
  it('should have necessary data for each country', () => {
    Object.keys(configMap).forEach(country => {
      const countryConfig = configMap[country as Country];
      expect(countryConfig).toHaveProperty('defaultBoundariesFile');
      expect(countryConfig).toHaveProperty('rawTables');
      expect(countryConfig).toHaveProperty('rawReports');
      expect(countryConfig).toHaveProperty('appConfig');
      expect(countryConfig).toHaveProperty('rawLayers');
    });
  });

  it('should have translations with correct depth', () => {
    Object.keys(configMap).forEach(country => {
      const config = configMap[country as Country];
      const layers = getRawLayers(country as Country);
      const translation = getTranslation(country as Country);

      // TODO - activate translation for reports and tables
      // const reports = config.rawReports;
      // const tables = config.rawTables;

      // All the elements need translation and should appear at least once in the translations:
      /**
       * - All the keys in config.categories
       * - All the key
       */
      let itemsToTranslate: string[] = [];

      // categories
      const categoryKeys = jp
        .query(config.appConfig.categories, '$.*')
        .filter(
          (value: any) =>
            typeof value === 'string' ||
            (typeof value === 'object' &&
              value !== null &&
              !Array.isArray(value)),
        )
        .map((value: any) =>
          typeof value === 'object' ? Object.keys(value) : value,
        )
        .flat()
        .map((value: any) => startCase(value));

      // grouped layer titles
      const categoryGroupTitles = jp.query(
        config.appConfig.categories,
        '$..group_title',
      );

      // layers titles
      const layerTitles = jp.query(layers, '$..title');
      const layerLegendTexts = jp.query(layers, '$..legend_text');
      const chartLegendLabels = jp.query(
        layers,
        '$..chart_data.fields[*].label',
      );
      // const legendLabels = jp.query(layers, '$..legend[*].label');
      // eslint-disable-next-line fp/no-mutation
      itemsToTranslate = [
        ...Array.from(translationKeys),
        ...categoryKeys,
        ...categoryGroupTitles,
        ...layerTitles,
        ...layerLegendTexts,
        ...chartLegendLabels,
      ];
      // Deduplicate items using a Set
      // eslint-disable-next-line fp/no-mutation
      itemsToTranslate = Array.from(new Set(itemsToTranslate));

      Object.entries(translation).forEach(([key, value]) => {
        if (key === 'en') {
          // nothing to do, we assume keys are in english
        } else {
          // compare translation with itemsToTranslate
          const missingFields: string[] = [];
          itemsToTranslate.forEach(item => {
            if (
              item !== '' &&
              !Object.prototype.hasOwnProperty.call(value, item)
            ) {
              // eslint-disable-next-line fp/no-mutating-methods
              missingFields.push(item);
            }
          });
          if (missingFields.length > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `${missingFields.length} missing fields for ${country} - language: ${key}`,
            );
            console.error(missingFields);
          }
          // TODO - activate this assertion once all translations are complete
          // expect(missingFields).toEqual([]);
        }
      });
    });
  });
});
