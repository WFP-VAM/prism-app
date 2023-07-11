import { render } from '@testing-library/react';
import React from 'react';

import TimelineItems from '.';

const props = {
  intersectionDates: [],
  selectedLayers: [],
  selectedLayerTitles: [],
  dateRange: [
    {
      value: 1640883600000,
      label: '31 Dec 2021',
      month: 'Dec 2021',
      isFirstDay: false,
      date: '2021-12-31',
    },
  ],
  clickDate: () => {},
  locale: 'en',
};

test('renders as expected', () => {
  const { container } = render(<TimelineItems {...props} />);
  expect(container).toMatchSnapshot();
});
