import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import { store } from 'context/store';
import { createTheme, ThemeProvider } from '@mui/material';
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
        <ThemeProvider theme={createTheme()}>
          <MapView />
        </ThemeProvider>
      </Provider>,
    );
    expect(container).toMatchSnapshot();
  });
});
