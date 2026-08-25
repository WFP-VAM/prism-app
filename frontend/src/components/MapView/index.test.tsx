import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { store } from 'context/store';
import muiTheme from 'muiTheme';
import { Provider } from 'react-redux';
import {
  isUniversalDeployment,
  usesPmtilesBoundaries,
} from 'utils/universal-utils';

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
  usesPmtilesBoundaries: jest.fn(() => false),
}));

const mockIsUniversalDeployment = isUniversalDeployment as jest.MockedFunction<
  typeof isUniversalDeployment
>;

const mockUsesPmtilesBoundaries = usesPmtilesBoundaries as jest.MockedFunction<
  typeof usesPmtilesBoundaries
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
    mockUsesPmtilesBoundaries.mockReturnValue(false);
  });

  test('renders as expected', () => {
    const { container } = render(
      <Provider store={store}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={muiTheme}>
            <MapView />
          </ThemeProvider>
        </StyledEngineProvider>
      </Provider>,
    );
    expect(container).toMatchSnapshot();
  });

  test('shows boundary loading overlay for PMTiles-boundary deployments', () => {
    mockUsesPmtilesBoundaries.mockReturnValue(true);

    render(
      <Provider store={store}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={muiTheme}>
            <MapView />
          </ThemeProvider>
        </StyledEngineProvider>
      </Provider>,
    );

    expect(screen.getByText('Loading boundaries')).toBeInTheDocument();
  });
});
