import fg from 'fast-glob';
import fs from 'fs';
import { Country, configMap, getRawLayers, getTranslation } from './index';
import { extractTranslationItems } from './config.test.utils';

function loadTranslationKeys(): Set<string> {
  const translationKeyRegex = /[ {]t\('([^']+)'\)/g;
  const files = fg.sync('./src/**/*.{ts,tsx}');
  const translationKeys = new Set<string>();

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = translationKeyRegex.exec(content)) !== null) {
      translationKeys.add(match[1]);
    }
  });

  return translationKeys;
}

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
      const layers = getRawLayers(country as Country, true);
      const translation = getTranslation(country as Country);
      // Translation keys in the code
      const translationKeys = loadTranslationKeys();

      // TODO - activate translation for reports and tables
      // const reports = config.rawReports;
      // const tables = config.rawTables;

      // All the elements need translation and should appear at least once in the translations:
      /**
       * - All the keys in config.categories
       * - All the key
       */
      let itemsToTranslate: string[] = [];

      // const legendLabels = jp.query(layers, '$..legend[*].label');

      itemsToTranslate = [
        ...Array.from(translationKeys),
        ...extractTranslationItems(config.appConfig, layers),
      ];
      // Deduplicate items using a Set

      itemsToTranslate = Array.from(new Set(itemsToTranslate));

      Object.entries(translation).forEach(([key, value]) => {
        if (key === 'en' && country !== 'mozambbique') {
          // return early so we only test for English keys once
          return;
        }
        if (key === 'en') {
          itemsToTranslate = Array.from(new Set(translationKeys));
        }
        // compare translation with itemsToTranslate
        const missingFields: string[] = [];
        itemsToTranslate.forEach(item => {
          if (
            item !== '' &&
            !Object.prototype.hasOwnProperty.call(value, item)
          ) {
            missingFields.push(item);
          }
        });
        if (missingFields.length > 0) {
          // Create an array to hold the table data
          const tableData: { [key: string]: string }[] = [];

          // Populate the table data with missing fields
          missingFields.forEach(field => {
            const row: { [key: string]: string } = {
              [`Missing Fields: ${country} - ${key}`]: `${field.slice(0, 64)}${field.length > 64 ? '...' : ''}`,
            };

            tableData.push(row);
          });

          // Print the table to the console
          // eslint-disable-next-line no-console
          console.table(tableData);

          // utility to print the missing fields as an exploitable JSON object
          // if (key === 'fr') {
          //   // eslint-disable-next-line no-console
          //   console.log(
          //     JSON.stringify(
          //       Object.fromEntries(missingFields.map(field => [field, field])),
          //     ),
          //   );
          // }
        }
        // TODO - activate this assertion once all translations are complete
        // expect(missingFields).toEqual([]);
      });
    });
  });
});
