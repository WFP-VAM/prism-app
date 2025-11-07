import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { PanelSize } from 'config/types';
import { getAvailableDatesForLayer } from 'utils/server-utils';
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
jest.mock('./TimelineItems', () => () => 'mock-timelineitems');

const mockStore = configureStore([]);

test('renders as expected with a single date', () => {
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
    leftPanelState: {
      panelSize: PanelSize.medium,
    },
    serverState: { availableDates: {}, loading: false },
    anticipatoryActionDroughtState: {
      availableDates: undefined,
    },
    anticipatoryActionStormState: {
      availableDates: undefined,
    },
  });

  const { container } = render(
    <Provider store={store}>
      <DateSelector />
    </Provider>,
  );

  expect(container).toMatchSnapshot();

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});

test('renders correct dates for rainfall_agg_6month over 2025', async () => {
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
    leftPanelState: {
      panelSize: PanelSize.medium,
    },
    serverPreloadState: {
      WMSLayerDates: {
        // availableDates dates from 11/oct/2024 to 01/nov/2025
        // every dekad
        // TODO: there is an edge-case when the latest date here
        // has a validity including "today", maybe run the test twice
        // with a mocked "today" date just after this, and far in the future
        rainfall_agg_6month: [
          1728648000000, 1729512000000, 1730462400000, 1731326400000,
          1732190400000, 1733054400000, 1733918400000, 1734782400000,
          1735732800000, 1736596800000, 1737460800000, 1738411200000,
          1739275200000, 1740139200000, 1740830400000, 1741694400000,
          1742558400000, 1743508800000, 1744372800000, 1745236800000,
          1746100800000, 1746964800000, 1747828800000, 1748779200000,
          1749643200000, 1750507200000, 1751371200000, 1752235200000,
          1753099200000, 1754049600000, 1754913600000, 1755777600000,
          1756728000000, 1757592000000, 1758456000000, 1759320000000,
          1760184000000, 1761048000000, 1761998400000,
        ],
      },
    },
    serverState: { availableDates: {}, loading: false },
    anticipatoryActionDroughtState: {
      availableDates: undefined,
    },
    anticipatoryActionStormState: {
      availableDates: undefined,
    },
  });

  const availableDates = await getAvailableDatesForLayer(
    // @ts-ignore
    store.getState,
    'rainfall_agg_6month',
  );
  // array starts on 01/may/2024 until 31/oct/2025
  const ad = availableDates.rainfall_agg_6month;
  // TODO: AvailableDates should only be the dates offered by the server
  // so length should match that (39 here)
  expect(ad.length).toEqual(396);
  // @ts-ignore
  expect(ad.at(0).displayDate).toEqual(1728648000000);
  // @ts-ignore
  expect(ad.at(-1).displayDate).toEqual(
    // last available date + 1 dekad
    new Date('2025-11-10T12:00:00Z').getTime(),
  );
  expect(availableDates).toMatchSnapshot();
  // ad is way too long because it contains up to 6 or 7 times each
  // displayDate, with different queryDates.
  // eg for 30/09/2025, it has 2 queryDate of 21/9 and 21/10
  // and 2 periods from 01/04 to 30/9 and 01/05 to 31/10, why?

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});

test('renders correct dates for rainfall_agg_1month over 2025', async () => {
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
    leftPanelState: {
      panelSize: PanelSize.medium,
    },
    serverPreloadState: {
      WMSLayerDates: {
        // availableDates dates from 11/oct/2024 to 01/nov/2025
        // every dekad
        rainfall_agg_1month: [
          1728648000000, 1729512000000, 1730462400000, 1731326400000,
          1732190400000, 1733054400000, 1733918400000, 1734782400000,
          1735732800000, 1736596800000, 1737460800000, 1738411200000,
          1739275200000, 1740139200000, 1740830400000, 1741694400000,
          1742558400000, 1743508800000, 1744372800000, 1745236800000,
          1746100800000, 1746964800000, 1747828800000, 1748779200000,
          1749643200000, 1750507200000, 1751371200000, 1752235200000,
          1753099200000, 1754049600000, 1754913600000, 1755777600000,
          1756728000000, 1757592000000, 1758456000000, 1759320000000,
          1760184000000, 1761048000000, 1761998400000,
        ],
      },
    },
    serverState: { availableDates: {}, loading: false },
    anticipatoryActionDroughtState: {
      availableDates: undefined,
    },
    anticipatoryActionStormState: {
      availableDates: undefined,
    },
  });

  const availableDates = await getAvailableDatesForLayer(
    // @ts-ignore
    store.getState,
    'rainfall_agg_1month',
  );
  // array starts on 01/may/2024 until 31/oct/2025
  const ad = availableDates.rainfall_agg_1month;
  expect(ad.length).toEqual(396);
  expect(availableDates).toMatchSnapshot();
  // ad is way too long because it contains up to 6 or 7 times each
  // displayDate, with different queryDates.
  // eg for 30/09/2025, it has 2 queryDate of 21/9 and 21/10
  // and 2 periods from 01/04 to 30/9 and 01/05 to 31/10, why?

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});

// add test for layer with no validity defined
// add test for coverage window
// why are these tests so slow?
// fix bug about scrolling dates backwards
// and variant activation of layer
