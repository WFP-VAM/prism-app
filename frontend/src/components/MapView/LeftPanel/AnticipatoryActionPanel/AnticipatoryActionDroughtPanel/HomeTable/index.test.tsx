import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { Panel } from 'config/types';
import HomeTable from '.';
import { defaultDialogs, mockAARenderedDistricts } from '../test.utils';

const mockStore = configureStore([]);

const store = mockStore({
  mapState: {
    layers: [],
    dateRange: { startDate: 1701432000000 },
    maplibreMap: () => {},
    errors: [],
    layersData: [],
    loadingLayerIds: [],
    boundaryRelationData: {},
  },
  serverState: { availableDates: {}, loading: false },
  anticipatoryActionDroughtState: {
    filters: {
      selectedWindow: 'Window 1',
      categories: {
        Severe: true,
        Moderate: true,
        Mild: true,
      },
    },
    monitoredDistricts: ['Caia'],
    renderedDistricts: mockAARenderedDistricts,
    windowRanges: { 'Window 2': { start: '2023-08-01', end: '2023-12-01' } },
  },
  leftPanelState: {
    tabValue: Panel.AnticipatoryActionDrought,
  },
});

describe('HomeTable', () => {
  beforeAll(() => {
    // Mock the date to a specific value
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-01'));
  });

  afterAll(() => {
    // Restore the real timer
    jest.useRealTimers();
  });

  test('renders as expected', () => {
    const { container } = render(
      <BrowserRouter>
        <Provider store={store}>
          <HomeTable dialogs={defaultDialogs} />
        </Provider>
      </BrowserRouter>,
    );
    expect(container).toMatchSnapshot();
  });
});
