import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core/styles';
import { store } from '@/context/store';
import AlertForm from '.';

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
