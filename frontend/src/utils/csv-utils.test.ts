import React from 'react';
import { castObjectsArrayToCsv } from './csv-utils';

describe('Test castObjectsArrayToCsv', () => {
  test('generates CSV string and renames columns', () => {
    const objectsArray = [
      { colA: 2, colB: 'val2' },
      { colA: 1, colB: 'val1' },
    ];

    const columnsNames = { colB: 'newColB' };

    const expectedResult = 'colA,newColB\n2,val2\n1,val1';

    const output = castObjectsArrayToCsv(objectsArray, columnsNames);

    expect(output).toEqual(expectedResult);
  });
  test('adds sep tag at the beginning of the csv for non comma separators', () => {
    const objectsArray = [
      { colA: 2, colB: 'val2' },
      { colA: 1, colB: 'val1' },
    ];

    const expectedResult = 'sep=;\ncolA;colB\n2;val2\n1;val1';

    const output = castObjectsArrayToCsv(objectsArray, {}, ';');

    expect(output).toEqual(expectedResult);
  });
});
