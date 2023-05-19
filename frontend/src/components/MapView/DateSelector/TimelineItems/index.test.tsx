import React from 'react';
import { render } from '@testing-library/react';

import TimelineItems from '.';

const props = {
  intersectionDates: [],
  selectedLayerDates: [[]],
  selectedLayerTitles: [],
  dateRange: [
    {
      value: 1640883600000,
      label: '31 Dec 2021',
      month: 'Dec 2021',
      isFirstDay: false,
    },
  ],
  clickDate: () => {},
  locale: 'en',
};

test('renders as expected', () => {
  const { container } = render(<TimelineItems {...props} />);
  expect(container).toMatchSnapshot();
});
