import { downloadToFile } from 'components/MapView/utils';
import { DatasetField } from 'config/types';
import { TableData } from 'context/tableStateSlice';
import { groupBy, mapKeys, snakeCase } from 'lodash';

export function castObjectsArrayToCsv<T extends { [key: string]: any }>(
  objectsArray: T[],
  columnsNames: Partial<Record<keyof T, string>>,
  sep: string = ',',
): string {
  const objectKeys = Object.keys(objectsArray[0]);

  const columns = objectKeys.map(key => columnsNames[key] ?? key);

  return [
    ...(sep === ',' ? [] : [`sep=${sep}`]),
    columns.join(sep),
    ...objectsArray.map(obj => Object.values(obj).join(sep)),
  ].join('\n');
}

export const getExposureAnalysisCsvData = (
  exposureAnalysisColumnsToRender: { [x: string]: string | number },
  exposureAnalysisTableRowsToRender: { [x: string]: string | number }[],
) =>
  [exposureAnalysisColumnsToRender, ...exposureAnalysisTableRowsToRender]
    .map(analysisCsvItem => Object.values(analysisCsvItem))
    .join('\n');

export const createCsvDataFromDataKeyMap = (
  tableData: TableData,
  keyMap: { [p: string]: string | undefined },
) => {
  // The column names of the csv based on the rows first item
  const columnNamesObject = tableData.rows.slice(0, 1)[0];
  return tableData.rows.slice(1).map(row =>
    Object.fromEntries(
      // Filters the Normal column or `fallback` data from every data set
      Object.entries(row)
        .filter(([key]) => columnNamesObject[key] !== 'Normal')
        .map(([key, value]) => {
          const newKey = keyMap[key] ? keyMap[key] : key;
          return [newKey, value];
        }),
    ),
  );
};

export const createDataKeyMap = (
  tableData: TableData,
  datasetFields: DatasetField[],
) =>
  Object.fromEntries(
    Object.entries(tableData.rows[0]).map(([key, value]) => {
      const newKey = datasetFields.find(x => x.label === value)?.key;
      return [key, newKey];
    }),
  );

export const downloadChartsToCsv =
  (params: [{ [key: string]: any[] }, string][]) => () => {
    params.forEach(([dataForCsv, filename]) => {
      const dateColumn = 'Date';
      const getKeyName = (key: string, chartName: string) =>
        key.endsWith('_avg')
          ? `${snakeCase(chartName)}_avg`
          : snakeCase(chartName);

      const columnsNamesPerChart = Object.entries(dataForCsv).map(
        ([key, value]) => {
          const keys = Object.keys(value[0]);
          const filtered = keys.filter(x => x !== dateColumn);
          const mapped = filtered.map(x => getKeyName(x, key));
          return Object.fromEntries(mapped.map(x => [x, x]));
        },
      );

      const columnsNames = columnsNamesPerChart.reduce(
        (prev, curr) => ({ ...prev, ...curr }),
        { [dateColumn]: dateColumn },
      );

      const merged = Object.entries(dataForCsv)
        .map(([key, value]) =>
          value.map(x =>
            mapKeys(x, (_v, k) =>
              k === dateColumn ? dateColumn : getKeyName(k, key),
            ),
          ),
        )
        .flat();
      if (merged.length < 1) {
        return;
      }

      const grouped = groupBy(merged, dateColumn);
      // The blueprint of objects array data
      const initialObjectsArrayBlueprintData = Object.keys(columnsNames).reduce(
        (acc: { [key: string]: string }, key) => {
          acc[key] = '';
          return acc;
        },
        {},
      );

      const objectsArray = Object.entries(grouped).map(([, value]) =>
        value.reduce(
          (prev, curr) => ({ ...prev, ...curr }),
          initialObjectsArrayBlueprintData,
        ),
      );

      downloadToFile(
        {
          content: castObjectsArrayToCsv(objectsArray, columnsNames, ','),
          isUrl: false,
        },
        filename,
        'text/csv',
      );
    });
  };
