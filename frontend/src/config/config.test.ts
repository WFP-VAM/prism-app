import jp from 'jsonpath';
import { Country, configMap, getRawLayers, getTranslation } from './index';
import { startCase } from 'lodash';

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
      if (country === 'mozambique') {
        itemsToTranslate = [
          ...categoryKeys,
          ...categoryGroupTitles,
          ...layerTitles,
          ...layerLegendTexts,
          ...chartLegendLabels,
        ];
        // console.log(Object.keys(translation));

        // Deduplicate items using a Set
        itemsToTranslate = Array.from(new Set(itemsToTranslate));
      }
      Object.entries(translation).forEach(([key, value]) => {
        if (key === 'en') {
          // nothing to do, we assume keys are in english
        } else {
          // compare translation with itemsToTranslate
          const missingFields: string[] = [];
          itemsToTranslate.forEach(item => {
            if (!Object.prototype.hasOwnProperty.call(value, item)) {
              missingFields.push(item);
            }
          });
          if (missingFields.length > 0) {
            console.warn(
              `${missingFields.length} missing fields for ${country} - language: ${key}`,
            );
          }
          expect(missingFields).toEqual([]);
        }
      });
    });
  });
});
