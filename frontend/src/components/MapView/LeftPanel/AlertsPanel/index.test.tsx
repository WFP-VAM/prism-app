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

import AlertsPanel from '.';

declare module '@mui/styles/defaultTheme' {
  interface DefaultTheme extends Theme {}
}

jest.mock('../../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={muiTheme}>
          <StylesThemeProvider theme={muiTheme}>
            <StylesProvider injectFirst>
              <AlertsPanel />
            </StylesProvider>
          </StylesThemeProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </Provider>,
  );
  return expect(rendered.container).toMatchSnapshot();
});
