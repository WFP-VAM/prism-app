import timezoneMock from 'timezone-mock';
import { TableDataFormat, createTableData } from './datasetStateSlice';
import { timezones } from '../../test/helpers';

const f = () => {
  const ret = createTableData(
    createTableDataTestData.results,
    createTableDataTestData.format,
  );

  expect(ret).toEqual(createTableDataTestData.ret);
};

describe('createTableData DATE', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test.each(timezones)('Should work with %s', timezone => {
    timezoneMock.register(timezone);
    f();
  });
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
        Date: '2020-07-31',
        d1: '0.1826',
        d2: '3.9844',
      },
      {
        Date: '2020-08-10',
        d1: '0.5711',
        d2: '4.0623',
      },
      {
        Date: '2020-08-20',
        d1: '3.2777',
        d2: '4.1198',
      },
      {
        Date: '2020-08-31',
        d1: '5.0461',
        d2: '3.4241',
      },
      {
        Date: '2020-09-10',
        d1: '0.1639',
        d2: '2.995',
      },
      {
        Date: '2020-09-20',
        d1: '2.9091',
        d2: '3.9275',
      },
      {
        Date: '2020-09-30',
        d1: '5.2963',
        d2: '4.4112',
      },
      {
        Date: '2020-10-10',
        d1: '13.734',
        d2: '5.467',
      },
      {
        Date: '2020-10-20',
        d1: '4.8938',
        d2: '9.3407',
      },
      {
        Date: '2020-10-31',
        d1: '11.8458',
        d2: '14.193',
      },
    ],
    columns: ['Date', 'd1', 'd2'],
  },
};

const f2 = () => {
  const ret = createTableData(
    createTableDataTestEwsData.results,
    createTableDataTestEwsData.format,
  );

  expect(ret).toEqual(createTableDataTestEwsData.ret);
};

describe('createTableData TIME', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test('Should work with UTC', () => {
    timezoneMock.register('UTC');
    f2();
  });

  test('Should work with US/Pacific', () => {
    timezoneMock.register('US/Pacific');
    f2();
  });

  test('Should work with Etc/GMT-1', () => {
    timezoneMock.register('Etc/GMT-1');
    f2();
  });
});

const createTableDataTestEwsData = {
  results: [
    {
      date: 1707858456000,
      values: {
        measure: '3189',
      },
    },
    {
      date: 1707859263000,
      values: {
        measure: '2038',
      },
    },
    {
      date: 1707860069000,
      values: {
        measure: '1849',
      },
    },
    {
      date: 1707860886000,
      values: {
        measure: '1727',
      },
    },
    {
      date: 1707861693000,
      values: {
        measure: '567',
      },
    },
    {
      date: 1707862499000,
      values: {
        measure: '4244',
      },
    },
    {
      date: 1707863305000,
      values: {
        measure: '3660',
      },
    },
  ],
  format: TableDataFormat.TIME,
  ret: {
    rows: [
      {
        Date: 'Date',
        d1: 'measure',
      },
      {
        Date: '2024-02-13 21:07',
        d1: '3189',
      },
      {
        Date: '2024-02-13 21:21',
        d1: '2038',
      },
      {
        Date: '2024-02-13 21:34',
        d1: '1849',
      },
      {
        Date: '2024-02-13 21:48',
        d1: '1727',
      },
      {
        Date: '2024-02-13 22:01',
        d1: '567',
      },
      {
        Date: '2024-02-13 22:14',
        d1: '4244',
      },
      {
        Date: '2024-02-13 22:28',
        d1: '3660',
      },
    ],
    columns: ['Date', 'd1'],
  },
};
