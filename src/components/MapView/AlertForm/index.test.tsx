import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core/styles';
import AlertForm from '.';
import { store } from '../../../context/store';

jest.mock('../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <ThemeProvider theme={createMuiTheme()}>
        <AlertForm isOpen setOpen={jest.fn()} />
      </ThemeProvider>
    </Provider>,
  );
  return expect(rendered.container).toMatchSnapshot();
});
