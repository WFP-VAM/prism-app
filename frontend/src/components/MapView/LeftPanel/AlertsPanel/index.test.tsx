import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { store } from 'context/store';
import muiTheme from 'muiTheme';
import { Provider } from 'react-redux';

import AlertsPanel from '.';

jest.mock('../../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <ThemeProvider theme={muiTheme}>
        <AlertsPanel />
      </ThemeProvider>
    </Provider>,
  );
  return expect(rendered.container).toMatchSnapshot();
});
