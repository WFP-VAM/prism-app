import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../../../context/store';

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
  const { container } = render(
    <Provider store={store}>
      <TimelineItems {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
