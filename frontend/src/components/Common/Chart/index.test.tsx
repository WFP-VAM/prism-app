import { render } from '@testing-library/react';
import Chart from '.';

test('Renders as expected', () => {
  const { container } = render(
    <Chart title="Chart Title" data={data} config={config} />,
  );

  expect(container).toMatchSnapshot();
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
