import { createTheme, ThemeProvider } from '@material-ui/core';
import { render, screen } from '@testing-library/react';
import { store } from 'context/store';
import { Provider } from 'react-redux';
import { isUniversalDeployment } from 'utils/universal-utils';

import MapView from '.';

jest.mock('./Layers/WMSLayer', () => 'mock-WMSLayer');
jest.mock('./Layers/ImpactLayer', () => 'mock-ImpactLayer');
jest.mock('./Layers/AdminLevelDataLayer', () => 'mock-AdminLevelDataLayer');
jest.mock('./Layers/BoundaryLayer', () => 'mock-BoundaryLayer');

jest.mock('./Legends', () => 'mock-Legends');
jest.mock('./DateSelector', () => 'mock-DateSelector');

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

jest.mock('utils/universal-utils', () => ({
  ...jest.requireActual('utils/universal-utils'),
  isUniversalDeployment: jest.fn(() => false),
}));

const mockIsUniversalDeployment = isUniversalDeployment as jest.MockedFunction<
  typeof isUniversalDeployment
>;

describe('MapView', () => {
  beforeAll(() => {
    // Mock the date to a specific value
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-01'));
  });

  afterAll(() => {
    // Restore the real timer
    jest.useRealTimers();
  });

  afterEach(() => {
    mockIsUniversalDeployment.mockReturnValue(false);
  });

  test('renders as expected', () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapView />
        </ThemeProvider>
      </Provider>,
    );
    expect(container).toMatchSnapshot();
  });

  test('shows boundary loading overlay in universal deployments', () => {
    mockIsUniversalDeployment.mockReturnValue(true);

    render(
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <MapView />
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.getByText('Loading boundaries…')).toBeInTheDocument();
  });
});
