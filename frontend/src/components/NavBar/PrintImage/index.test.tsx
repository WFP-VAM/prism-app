import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Panel } from 'config/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { thunk } from 'redux-thunk';
import Download from '.';

const mockStore = configureStore([thunk as any]);

test('renders as expected', () => {
  const realDateNow = Date.now.bind(global.Date);
  const dateNowStub = jest.fn(() => 1530518207007);
  // eslint-disable-next-line fp/no-mutation
  global.Date.now = dateNowStub;

  const store = mockStore({
    mapState: {
      layers: [],
      dateRange: { startDate: 1530518207007 },
      maplibreMap: () => {},
      errors: [],
      layersData: [],
      loadingLayerIds: [],
      boundaryRelationData: {},
    },
    serverState: { availableDates: {}, loading: false },
    anticipatoryActionDroughtState: {
      renderedDistricts: { 'Window 1': {}, 'Window 2': {} },
      filters: { selectedWindow: 'All' },
    },
    anticipatoryActionFloodState: {
      stations: [],
      selectedStation: null,
      selectedDate: null,
      forecastData: {},
      probabilitiesData: {},
      stationSummaryData: {},
      availableDates: [],
      view: 'home',
      loading: false,
      error: null,
    },
    analysisResultState: {
      isMapLayerActive: false,
    },
    leftPanelState: {
      tabValue: Panel.AnticipatoryActionDrought,
    },
    dashboardState: {
      dashboardTitle: 'Test Dashboard',
      columns: [],
      selectedDashboardIndex: 0,
    },
  });

  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <Download />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();

  // eslint-disable-next-line fp/no-mutation
  global.Date.now = realDateNow;
});
