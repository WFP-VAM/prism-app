import { TableDataFormat, createTableData } from './datasetStateSlice';

test('createTableData', () => {
  const ret = createTableData(
    createTableDataTestData.results,
    createTableDataTestData.format,
  );

  expect(ret).toEqual(createTableDataTestData.ret);
});

const createTableDataTestData = {
  results: [
    {
      date: 1596229200000,
      values: {
        Rainfall: '0.1826',
        Average: '3.9844',
      },
    },
    {
      date: 1597093200000,
      values: {
        Rainfall: '0.5711',
        Average: '4.0623',
      },
    },
    {
      date: 1597957200000,
      values: {
        Rainfall: '3.2777',
        Average: '4.1198',
      },
    },
    {
      date: 1598907600000,
      values: {
        Rainfall: '5.0461',
        Average: '3.4241',
      },
    },
    {
      date: 1599771600000,
      values: {
        Rainfall: '0.1639',
        Average: '2.995',
      },
    },
    {
      date: 1600635600000,
      values: {
        Rainfall: '2.9091',
        Average: '3.9275',
      },
    },
    {
      date: 1601499600000,
      values: {
        Rainfall: '5.2963',
        Average: '4.4112',
      },
    },
    {
      date: 1602363600000,
      values: {
        Rainfall: '13.734',
        Average: '5.467',
      },
    },
    {
      date: 1603227600000,
      values: {
        Rainfall: '4.8938',
        Average: '9.3407',
      },
    },
    {
      date: 1604181600000,
      values: {
        Rainfall: '11.8458',
        Average: '14.193',
      },
    },
  ],
  format: TableDataFormat.DATE,
  ret: {
    rows: [
      {
        Date: 'Date',
        d1: 'Rainfall',
        d2: 'Average',
      },
      {
        Date: '2020-08-01',
        d1: '0.1826',
        d2: '3.9844',
      },
      {
        Date: '2020-08-11',
        d1: '0.5711',
        d2: '4.0623',
      },
      {
        Date: '2020-08-21',
        d1: '3.2777',
        d2: '4.1198',
      },
      {
        Date: '2020-09-01',
        d1: '5.0461',
        d2: '3.4241',
      },
      {
        Date: '2020-09-11',
        d1: '0.1639',
        d2: '2.995',
      },
      {
        Date: '2020-09-21',
        d1: '2.9091',
        d2: '3.9275',
      },
      {
        Date: '2020-10-01',
        d1: '5.2963',
        d2: '4.4112',
      },
      {
        Date: '2020-10-11',
        d1: '13.734',
        d2: '5.467',
      },
      {
        Date: '2020-10-21',
        d1: '4.8938',
        d2: '9.3407',
      },
      {
        Date: '2020-11-01',
        d1: '11.8458',
        d2: '14.193',
      },
    ],
    columns: ['Date', 'd1', 'd2'],
  },
};
