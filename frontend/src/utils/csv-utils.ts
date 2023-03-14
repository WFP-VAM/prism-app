export function fillCSVMissingKeys<T extends { [key: string]: any }>(
  objectsArray: T[],
  columnsNames: Partial<Record<keyof T, string>>,
): { [key: string]: any }[] {
  // we load a blueprint as initial data in the objects array that we will create the CSV
  // in order to interpret the missing or null values
  const initialObjectsArrayBlueprintData = Object.keys(columnsNames).reduce(
    (acc: { [key: string]: string }, key) => {
      // eslint-disable-next-line fp/no-mutation
      acc[key] = '';
      return acc;
    },
    {},
  );
  // The actual objects Array to be interpreted in the CSV file that will use the blueprint as
  // initial data
  return objectsArray.map(obj => {
    return {
      ...initialObjectsArrayBlueprintData,
      ...obj,
    };
  });
}

export function castObjectsArrayToCsv<T extends { [key: string]: any }>(
  objectsArray: T[],
  columnsNames: Partial<Record<keyof T, string>>,
  sep: string = ',',
): string {
  const objectKeys = Object.keys(objectsArray[0]);

  const columns = objectKeys.map(key => columnsNames[key] ?? key);

  // If we have missing keys in some data we fill them with empty strings
  const actualObjectsArray = fillCSVMissingKeys(objectsArray, columnsNames);

  return [
    ...(sep === ',' ? [] : [`sep=${sep}`]),
    columns.join(sep),
    ...actualObjectsArray.map(obj => {
      return Object.values(obj).join(sep);
    }),
  ].join('\n');
}
