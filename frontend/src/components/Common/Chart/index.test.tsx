import React from 'react';
import timezoneMock from 'timezone-mock';
import { render } from '@testing-library/react';
import Chart, { getLabels } from '.';

const f = () => {
  const { container } = render(
    <Chart title="Chart Title" data={data} config={config} />,
  );

  const testLabels = getLabels({
    chartRange: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
    category: config.category,
    header: data.rows[0],
    indices: [],
    isEWSChart: false,
    locale: 'en',
    tableRows: data.rows.slice(1, data.rows.length),
    transpose: true,
  });

  const testEWSLabels = getLabels({
    chartRange: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
    category: config.category,
    header: EWSData.rows[0],
    indices: [],
    isEWSChart: true,
    locale: 'en',
    tableRows: EWSData.rows.slice(1, EWSData.rows.length),
    transpose: true,
  });

  expect(testLabels).toEqual(labels);
  expect(testEWSLabels).toEqual(EWSlabels);
  expect(container).toMatchSnapshot();
};

describe('renders as expected', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test('Should work with UTC', () => {
    timezoneMock.register('UTC');
    f();
  });

  test('Should work with US/Pacific', () => {
    timezoneMock.register('US/Pacific');
    f();
  });

  test('Should work with Etc/GMT-1', () => {
    timezoneMock.register('Etc/GMT-1');
    f();
  });
});

const config = {
  type: 'bar',
  stacked: false,
  category: 'Date',
  data: 'd',
  transpose: true,
  displayLegend: true,
  minValue: undefined,
  maxValue: undefined,
  colors: ['#233f5f', '#bdf2e6'],
};

const data = {
  rows: [
    {
      Date: '2023-09-01',
      d1: 0.118,
      d2: 3.4241,
    },
    {
      Date: '2023-09-11',
      d1: 3.066,
      d2: 2.995,
    },
    {
      Date: '2023-09-21',
      d1: 0.0313,
      d2: 3.9275,
    },
    {
      Date: '2023-10-01',
      d1: 1.8836,
      d2: 4.4112,
    },
    {
      Date: '2023-10-11',
      d1: 20.4653,
      d2: 5.467,
    },
    {
      Date: '2023-10-21',
      d1: 6.7066,
      d2: 9.3407,
    },
    {
      Date: '2023-11-01',
      d1: 25.6975,
      d2: 14.193,
    },
    {
      Date: '2023-11-11',
      d1: 14.9102,
      d2: 23.0743,
    },
    {
      Date: '2023-11-21',
      d1: 15.2911,
      d2: 30.4112,
    },
    {
      Date: '2023-12-01',
      d1: 20.3643,
      d2: 41.0511,
    },
  ],
  columns: ['Date', 'd1', 'd2'],
};

const labels = [
  '2023-09-11',
  '2023-09-21',
  '2023-10-01',
  '2023-10-11',
  '2023-10-21',
  '2023-11-01',
  '2023-11-11',
  '2023-11-21',
  '2023-12-01',
];

const EWSData = {
  rows: [
    {
      Date: 'Date',
      d1: 'measure',
    },
    {
      Date: '2024-02-02 07:10',
      d1: '7001',
    },
    {
      Date: '2024-02-02 07:26',
      d1: '7001',
    },
    {
      Date: '2024-02-02 07:42',
      d1: '7001',
    },
    {
      Date: '2024-02-02 07:58',
      d1: '7001',
    },
    {
      Date: '2024-02-02 08:14',
      d1: '7001',
    },
    {
      Date: '2024-02-02 08:51',
      d1: '7001',
    },
    {
      Date: '2024-02-02 09:07',
      d1: '7001',
    },
    {
      Date: '2024-02-02 09:23',
      d1: '7001',
    },
    {
      Date: '2024-02-02 09:39',
      d1: '7001',
    },
    {
      Date: '2024-02-02 09:56',
      d1: '7001',
    },
    {
      Date: '2024-02-02 10:32',
      d1: '7001',
    },
    {
      Date: '2024-02-02 10:48',
      d1: '7001',
    },
    {
      Date: '2024-02-02 11:05',
      d1: '7001',
    },
    {
      Date: '2024-02-02 11:21',
      d1: '7001',
    },
    {
      Date: '2024-02-02 11:37',
      d1: '7001',
    },
    {
      Date: '2024-02-02 11:53',
      d1: '7001',
    },
    {
      Date: '2024-02-02 12:09',
      d1: '7001',
    },
    {
      Date: '2024-02-02 12:25',
      d1: '7001',
    },
    {
      Date: '2024-02-02 12:41',
      d1: '7001',
    },
    {
      Date: '2024-02-02 13:18',
      d1: '7001',
    },
    {
      Date: '2024-02-02 13:34',
      d1: '7001',
    },
    {
      Date: '2024-02-02 13:50',
      d1: '7001',
    },
    {
      Date: '2024-02-02 15:08',
      d1: '7001',
    },
    {
      Date: '2024-02-02 15:24',
      d1: '7001',
    },
    {
      Date: '2024-02-02 15:40',
      d1: '7001',
    },
    {
      Date: '2024-02-02 16:37',
      d1: '7001',
    },
    {
      Date: '2024-02-02 16:53',
      d1: '7001',
    },
    {
      Date: '2024-02-02 17:30',
      d1: '7001',
    },
  ],
};

const EWSlabels = [
  '2024-02-02 07:10',
  '2024-02-02 07:26',
  '2024-02-02 07:42',
  '2024-02-02 07:58',
  '2024-02-02 08:14',
  '2024-02-02 08:51',
  '2024-02-02 09:07',
  '2024-02-02 09:23',
  '2024-02-02 09:39',
  '2024-02-02 09:56',
  '2024-02-02 10:32',
  '2024-02-02 10:48',
  '2024-02-02 11:05',
  '2024-02-02 11:21',
  '2024-02-02 11:37',
  '2024-02-02 11:53',
  '2024-02-02 12:09',
  '2024-02-02 12:25',
  '2024-02-02 12:41',
  '2024-02-02 13:18',
  '2024-02-02 13:34',
  '2024-02-02 13:50',
  '2024-02-02 15:08',
  '2024-02-02 15:24',
  '2024-02-02 15:40',
  '2024-02-02 16:37',
  '2024-02-02 16:53',
  '2024-02-02 17:30',
];
