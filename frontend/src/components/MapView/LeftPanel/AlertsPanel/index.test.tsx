import { createTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import { render } from '@testing-library/react';
import { store } from 'context/store';
import { Provider } from 'react-redux';

import AlertsPanel from '.';

jest.mock('../../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <AlertsPanel />
      </ThemeProvider>
    </Provider>,
  );
  return expect(rendered.container).toMatchSnapshot();
});
