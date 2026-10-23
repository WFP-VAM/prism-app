import { fireEvent, render, screen } from '@testing-library/react';
import { downloadToFile } from 'components/MapView/utils';
import { Panel } from 'config/types';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { TestBrowserRouter } from 'test/TestBrowserRouter';

import { defaultDialogs, mockAARenderedDistricts } from '../test.utils';
import HomeTable from '.';

jest.mock('components/MapView/utils', () => ({
  ...jest.requireActual('components/MapView/utils'),
  downloadToFile: jest.fn(),
}));

const mockStore = configureStore([]);

const makeState = (startDate: number) => ({
  mapState: {
    layers: [],
    dateRange: { startDate },
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

const store = mockStore(makeState(1701432000000));

const renderHomeTable = (s = store) =>
  render(
    <TestBrowserRouter>
      <Provider store={s}>
        <HomeTable dialogs={defaultDialogs} />
      </Provider>
    </TestBrowserRouter>,
  );

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
    const { container } = renderHomeTable();
    expect(container).toMatchSnapshot();
  });

  test('Summary button downloads a CSV named after the selected date', () => {
    renderHomeTable();
    fireEvent.click(screen.getByText('Summary'));
    expect(downloadToFile).toHaveBeenLastCalledWith(
      {
        content: expect.stringMatching(
          /^Window,Category,Phase,District,New\nWindow 1,/,
        ),
        isUrl: false,
      },
      expect.stringMatching(/^2023-12-01-aa-drought-summary/),
      'text/csv',
    );
  });

  test('Summary filename follows date changes', () => {
    renderHomeTable(mockStore(makeState(Date.UTC(2024, 2, 15, 12))));
    fireEvent.click(screen.getByText('Summary'));
    expect(downloadToFile).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.stringMatching(/^2024-03-15-aa-drought-summary/),
      'text/csv',
    );
  });
});
