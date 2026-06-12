import {
  StyledEngineProvider,
  Theme,
  ThemeProvider,
} from '@mui/material/styles';
import {
  StylesProvider,
  ThemeProvider as StylesThemeProvider,
} from '@mui/styles';
import { render } from '@testing-library/react';
import { store } from 'context/store';
import muiTheme from 'muiTheme';
import { Provider } from 'react-redux';

import MapView from '.';

declare module '@mui/styles/defaultTheme' {
  interface DefaultTheme extends Theme {}
}

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

  test('renders as expected', () => {
    const { container } = render(
      <Provider store={store}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={muiTheme}>
            <StylesThemeProvider theme={muiTheme}>
              <StylesProvider injectFirst>
                <MapView />
              </StylesProvider>
            </StylesThemeProvider>
          </ThemeProvider>
        </StyledEngineProvider>
      </Provider>,
    );
    expect(container).toMatchSnapshot();
  });
});
