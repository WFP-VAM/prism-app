import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import DateSelector from '.';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));
jest.mock('components/Notifier', () => 'mock-Notifier');
jest.mock('./TimelineItems', () => 'mock-TimelineItems');

const mockStore = configureStore([]);

test('renders as expected', () => {
  const realDateNow = Date.now.bind(global.Date);
  const dateNowStub = jest.fn(() => 1530518207007);
  // eslint-disable-next-line fp/no-mutation
  global.Date.now = dateNowStub;

  const store = mockStore({
    mapState: {
      layers: [],
      dateRange: { startDate: 1678528800000 },
      maplibreMap: () => {},
      errors: [],
      layersData: [],
      loadingLayerIds: [],
      boundaryRelationData: {},
    },
    serverState: { availableDates: {}, loading: false },
  });

  const { container } = render(
    <Provider store={store}>
      <DateSelector availableDates={[]} selectedLayers={[]} />
    </Provider>,
  );

  expect(container).toMatchSnapshot();

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});
