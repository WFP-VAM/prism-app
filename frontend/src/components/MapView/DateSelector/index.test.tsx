import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import DateSelector from '.';
import { findClosestDate } from './utils';

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

test('DateSelector utils', () => {
  const findClosestDateResult = findClosestDate(
    findClosestDateData.date,
    findClosestDateData.availableDates,
  ).toISOString();

  expect(findClosestDateResult).toBe(findClosestDateData.result);
});

const findClosestDateData = {
  date: 1702288800000,
  availableDates: [
    1689076800000,
    1689940800000,
    1690891200000,
    1691755200000,
    1692619200000,
    1693569600000,
    1694433600000,
    1695297600000,
    1696161600000,
    1697025600000,
    1697889600000,
    1698840000000,
    1699704000000,
    1700568000000,
    1701432000000,
    1702296000000,
    1703160000000,
    1704110400000,
    1704974400000,
  ],
  result: '2023-12-11T12:00:00.000Z',
};
