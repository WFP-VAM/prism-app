import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/styles';
import { createTheme } from '@material-ui/core/styles';
import { store } from 'context/store';
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
