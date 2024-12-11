import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import TimelineItems from '.';

const props = {
  orderedLayers: [],
  truncatedLayers: [],
  selectedLayerTitles: [],
  availableDates: [],
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

const mockStore = configureStore([]);

const store = mockStore({
  anticipatoryActionDroughtState: {
    availableDates: undefined,
  },
  anticipatoryActionStormState: {
    availableDates: undefined,
  },
  mapState: {
    layers: [],
    dateRange: { startDate: 1678528800000 },
  },
});

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <TimelineItems {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
