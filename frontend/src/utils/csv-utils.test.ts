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
});
